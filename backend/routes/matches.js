const express = require("express");
const mongoose = require("mongoose");
const Match = require("../models/Match");
const Team = require("../models/Team");
const Tournament = require("../models/Tournament");
const { adminAuth } = require("../middleware/auth");
const router = express.Router();

router.get("/tournament/:tournamentId", async (req, res) => {
  try {
    const matches = await Match.find({ tournament: req.params.tournamentId })
      .populate("teamA", "teamName captainName seed points")
      .populate("teamB", "teamName captainName seed points")
      .populate("winner", "teamName")
      .populate("loser", "teamName")
      .sort({ matchNumber: 1 });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/generate/:tournamentId", adminAuth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    if (!tournament)
      return res.status(404).json({ message: "Tournament not found" });

    const teams = await Team.find({
      tournament: req.params.tournamentId,
      status: "approved",
    }).sort({ points: -1, createdAt: 1 });

    if (teams.length < 2)
      return res
        .status(400)
        .json({ message: "Need at least 2 approved teams" });

    await Match.deleteMany({ tournament: req.params.tournamentId });

    for (let i = 0; i < teams.length; i++) {
      await Team.findByIdAndUpdate(teams[i]._id, {
        seed: i + 1,
        wins: 0,
        losses: 0,
        bracket: "pending",
      });
      teams[i].seed = i + 1;
    }

    let matches;
    if (tournament.format === "knockout_cum_league")
      matches = buildKnockoutCumLeague(teams, tournament);
    else if (tournament.format === "league_cum_knockout")
      matches = buildLeagueCumKnockout(teams, tournament);
    else if (tournament.format === "knockout_cum_knockout")
      matches = buildKnockoutCumKnockout(teams, tournament);
    else matches = buildDKO(teams, tournament);
    await Match.insertMany(matches);
    await Tournament.findByIdAndUpdate(req.params.tournamentId, {
      status: "fixture_generated",
    });
    res.json({ message: "Fixture generated", matches: matches.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id/score", adminAuth, async (req, res) => {
  try {
    const { teamAScore, teamBScore, winnerId, status, notes } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: "Match not found" });
    if (match.isBye)
      return res.status(400).json({ message: "Bye matches cannot be scored" });

    if (teamAScore) match.teamAScore = teamAScore;
    if (teamBScore) match.teamBScore = teamBScore;
    match.status = status || "completed";
    if (notes !== undefined) match.notes = notes;

    let tournamentJustCompleted = false;

    if (winnerId && match.status === "completed") {
      const teamAId = match.teamA?.toString();
      const teamBId = match.teamB?.toString();
      if (!teamAId || !teamBId)
        return res
          .status(400)
          .json({ message: "Match does not have two teams yet" });

      const loserId = teamAId === winnerId ? teamBId : teamAId;
      match.winner = winnerId;
      match.loser = loserId;

      await Team.findByIdAndUpdate(winnerId, { $inc: { wins: 1 } });
      await Team.findByIdAndUpdate(loserId, { $inc: { losses: 1 } });

      if (match.bracketType === "winners") {
        await Team.findByIdAndUpdate(winnerId, { bracket: "winners" });
        await Team.findByIdAndUpdate(loserId, { bracket: "losers" });
      } else if (match.bracketType === "losers") {
        await Team.findByIdAndUpdate(winnerId, { bracket: "losers" });
        await Team.findByIdAndUpdate(loserId, { bracket: "eliminated" });
      } else if (match.bracketType === "grand_final") {
        await Team.findByIdAndUpdate(winnerId, { bracket: "champion" });
        await Team.findByIdAndUpdate(loserId, { bracket: "eliminated" });
        tournamentJustCompleted = true;
      } else if (match.bracketType === "knockout") {
        // Combination formats: loss = eliminated; only the final deciding match crowns champion
        await Team.findByIdAndUpdate(loserId, { bracket: "eliminated" });
        if (match.decidesChampion) {
          await Team.findByIdAndUpdate(winnerId, { bracket: "champion" });
          tournamentJustCompleted = true;
        }
      }
      // bracketType === 'league': no immediate elimination — propagateCombinationResults handles it

      if (match.nextWinnerMatch) {
        await fillSlot(match.nextWinnerMatch, match.winner);
      }
      if (match.nextLoserMatch) {
        const nlm = await Match.findById(match.nextLoserMatch);
        if (nlm) {
          if (!nlm.teamA) nlm.teamA = loserId;
          else if (!nlm.teamB) nlm.teamB = loserId;
          await nlm.save();
        }
      }
    }

    await match.save();
    if (tournamentJustCompleted) {
      await Tournament.findByIdAndUpdate(match.tournament, { status: 'completed' });
    } else {
      await Tournament.findByIdAndUpdate(match.tournament, { status: 'ongoing' });
    }

    // ── Combination-format propagation ──────────────────────────────────
    // Fills any matches that source their teams from THIS match's winner
    // (used by Knockout-cum-League re-pairing), and checks whether THIS
    // match completes a league/group so the group winner can be pushed
    // into the next stage.
    if (match.winner) {
      await propagateCombinationResults(match);
    }

    const updated = await Match.findById(match._id)
      .populate("teamA", "teamName")
      .populate("teamB", "teamName")
      .populate("winner", "teamName")
      .populate("loser", "teamName");
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", adminAuth, async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
      .populate("teamA", "teamName")
      .populate("teamB", "teamName");
    if (!match) return res.status(404).json({ message: "Match not found" });
    res.json(match);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// DOUBLE KNOCKOUT FIXTURE BUILDER
//
// Strategy: represent every "slot" as an object that knows:
//   - which match produces the team for this slot (sourceMatch)
//   - whether it's a winner or loser slot
//   - the pre-filled team (for byes)
//
// We build WB rounds slot-by-slot, then build LB by tracking
// exactly which slots feed into which matches.
// ═══════════════════════════════════════════════════════════════════════
function buildDKO(teams, tournament) {
  const n = teams.length;
  const tId = tournament._id;
  const venue = tournament.venue;
  const date = tournament.startDate;
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(n, 2))));

  let mNum = 0;
  // Create a match shell
  const mkMatch = (bracketType, roundName, round) => ({
    _id: new mongoose.Types.ObjectId(),
    tournament: tId,
    matchNumber: ++mNum,
    round,
    roundName,
    bracketType,
    teamA: null,
    teamB: null,
    winner: null,
    loser: null,
    isBye: false,
    status: "scheduled",
    venue,
    scheduledDate: date,
    nextWinnerMatch: null,
    nextLoserMatch: null,
  });

  // A "slot" represents "the team that will come from source"
  // slot.team = pre-known team (bye) | null (TBD)
  // slot.match = the match object that produces this team
  // slot.role  = 'winner' | 'loser'
  const slot = (match, role, team = null) => ({ match, role, team });

  // ── WB Round 1 ──────────────────────────────────────────────────────
  // Place seeds into bracket using standard seeding
  const seedPos = seededSlots(size); // seedPos[i] = seed number at position i

  // wbSlots[i] = slot for position i after WB R1
  // These are the "winner slots" that feed into WB R2
  const wbR1Matches = [];
  const wbR1WinnerSlots = []; // slots feeding into WB R2
  const wbR1LoserSlots = []; // slots feeding into LB R1

  for (let i = 0; i < size; i += 2) {
    const seedA = seedPos[i];
    const seedB = seedPos[i + 1];
    const teamA = seedA <= n ? teams[seedA - 1] : null;
    const teamB = seedB <= n ? teams[seedB - 1] : null;

    const m = mkMatch("winners", "WB Round 1", 1);

    if (teamA && teamB) {
      // Real match
      m.teamA = teamA._id;
      m.teamB = teamB._id;
      wbR1Matches.push(m);
      wbR1WinnerSlots.push(slot(m, "winner"));
      wbR1LoserSlots.push(slot(m, "loser"));
    } else {
      // Bye: one real team, auto advances
      const realTeam = teamA || teamB;
      m.teamA = realTeam._id;
      m.isBye = true;
      m.status = "bye";
      m.winner = realTeam._id;
      wbR1Matches.push(m);
      // Winner slot pre-filled with real team
      wbR1WinnerSlots.push(slot(m, "winner", realTeam));
      // No loser slot for byes
    }
  }

  // ── WB subsequent rounds ─────────────────────────────────────────────
  // wbRoundSlots[r] = array of winner-slots entering round r+2
  // wbRoundMatches[r] = array of matches in WB round r+2
  // wbRoundLoserSlots[r] = loser slots from WB round r+2

  const allWBMatches = [...wbR1Matches];
  const wbRoundSlots = [wbR1WinnerSlots]; // index 0 = slots that produce WB R2 inputs
  const wbRoundLosers = [wbR1LoserSlots]; // index 0 = WB R1 loser slots → LB R1

  let wbRound = 2;
  let currentWBSlots = wbR1WinnerSlots;

  while (currentWBSlots.length > 1) {
    const isWBFinal = currentWBSlots.length === 2;
    const rName = isWBFinal ? "WB Final" : `WB Round ${wbRound}`;
    const nextWBSlots = [];
    const thisRoundLosers = [];
    const thisRoundMatches = [];

    for (let i = 0; i < currentWBSlots.length; i += 2) {
      const slotA = currentWBSlots[i];
      const slotB = currentWBSlots[i + 1];
      const m = mkMatch("winners", rName, wbRound);

      // Pre-fill known bye-advancers
      // if (slotA.team) m.teamA = slotA.team._id;
      // if (slotB && slotB.team) m.teamB = slotB.team._id;

      if (slotA.team && slotB?.team) {
        m.teamA = slotA.team._id;
        m.teamB = slotB.team._id;
      }

      // Wire: slotA.match winner/loser → this match's teamA
      if (slotA.role === "winner") slotA.match.nextWinnerMatch = m._id;
      else slotA.match.nextLoserMatch = m._id;

      if (slotB) {
        if (slotB.role === "winner") slotB.match.nextWinnerMatch = m._id;
        else slotB.match.nextLoserMatch = m._id;
      }

      thisRoundMatches.push(m);
      allWBMatches.push(m);
      nextWBSlots.push(slot(m, "winner"));
      thisRoundLosers.push(slot(m, "loser"));
    }

    wbRoundSlots.push(nextWBSlots);
    wbRoundLosers.push(thisRoundLosers);
    currentWBSlots = nextWBSlots;
    wbRound++;
  }

  // WB Final match
  const wbFinalMatch = allWBMatches[allWBMatches.length - 1];
  const wbFinalWinnerSlot = slot(wbFinalMatch, "winner");
  const wbFinalLoserSlot = slot(wbFinalMatch, "loser");

  // ── LB bracket ───────────────────────────────────────────────────────
  //
  // LB is built round by round.
  // We maintain a list of "current LB survivor slots" = teams still alive in LB.
  //
  // LB R1: pair up WB R1 loser slots
  // Then for each subsequent WB round (R2, R3..., WB Final):
  //   FEED round:  pair each LB survivor slot with one WB-round loser slot → 1:1
  //   ELIM round:  pair up the feed round winner slots (halve the count)
  //
  // KEY: feed round is strictly 1:1 — LB survivor[i] vs WB loser[i]
  //      So the number of feed matches = number of WB losers from that round
  //      = number of LB survivors coming in

  const allLBMatches = [];
  let lbRound = 1;

  // LB R1: pair WB R1 real losers
  const lbR1LoserSlots = wbRoundLosers[0]; // WB R1 real loser slots
  let currentLBSlots = []; // survivor slots after each LB round

  if (lbR1LoserSlots.length >= 2) {
    const lb1Matches = [];
    for (let i = 0; i + 1 < lbR1LoserSlots.length; i += 2) {
      const sA = lbR1LoserSlots[i];
      const sB = lbR1LoserSlots[i + 1];
      const m = mkMatch("losers", "LB Round 1", lbRound);

      sA.match.nextLoserMatch = m._id;
      sB.match.nextLoserMatch = m._id;

      lb1Matches.push(m);
      allLBMatches.push(m);
      currentLBSlots.push(slot(m, "winner"));
    }
    // If odd number of WB R1 real losers, the leftover goes to first feed
    if (lbR1LoserSlots.length % 2 === 1) {
      const leftover = lbR1LoserSlots[lbR1LoserSlots.length - 1];
      currentLBSlots.push(leftover); // carries over as a "pre-seeded" LB slot
    }
    lbRound++;
  } else if (lbR1LoserSlots.length === 1) {
    // Only 1 WB R1 real loser → carries directly to first feed
    currentLBSlots = [lbR1LoserSlots[0]];
  }

  // Now process WB R2, R3, ..., WB Final losers
  // wbRoundLosers[1] = WB R2 losers, wbRoundLosers[2] = WB R3 losers, etc.
  for (let wi = 1; wi < wbRoundLosers.length; wi++) {
    const wbLosers = wbRoundLosers[wi]; // loser slots dropping from WB this round
    const isLastWBRound = wi === wbRoundLosers.length - 1;

    // FEED ROUND: pair as many lower-bracket survivors as possible with incoming WB losers.
    // Any unmatched slots are carried into the elimination round instead of being reused.
    const pairCount = Math.min(currentLBSlots.length, wbLosers.length);
    const feedRName =
      isLastWBRound && pairCount === 1 ? "LB Final" : `LB Round ${lbRound}`;
    const feedMatches = [];
    const feedWinnerSlots = [];
    const carrySlots = [];

    for (let i = 0; i < pairCount; i++) {
      const lbSurvivorSlot = currentLBSlots[i] || currentLBSlots[0];
      const wbLoserSlot = wbLosers[i];
      const m = mkMatch("losers", feedRName, lbRound);

      // Wire LB survivor into this match
      if (lbSurvivorSlot.role === "winner")
        lbSurvivorSlot.match.nextWinnerMatch = m._id;
      else lbSurvivorSlot.match.nextLoserMatch = m._id;

      // Wire WB loser into this match
      wbLoserSlot.match.nextLoserMatch = m._id;

      feedMatches.push(m);
      allLBMatches.push(m);
      feedWinnerSlots.push(slot(m, "winner"));
    }

    for (let i = pairCount; i < currentLBSlots.length; i++) {
      carrySlots.push(currentLBSlots[i]);
    }

    for (let i = pairCount; i < wbLosers.length; i++) {
      carrySlots.push(wbLosers[i]);
    }

    lbRound++;

    // ELIM ROUND: pair up feed winners (only if more than 1 feed match)
    const elimSources = [...feedWinnerSlots, ...carrySlots];

    if (elimSources.length > 1) {
      const elimCount = Math.ceil(elimSources.length / 2);
      const elimRName =
        isLastWBRound && elimCount === 1 ? "LB Final" : `LB Round ${lbRound}`;
      const elimMatches = [];
      const elimWinnerSlots = [];

      for (let i = 0; i < elimSources.length; i += 2) {
        const sA = elimSources[i];
        const sB = elimSources[i + 1];
        const m = mkMatch("losers", elimRName, lbRound);

        if (sA.role === "winner") sA.match.nextWinnerMatch = m._id;
        else sA.match.nextLoserMatch = m._id;

        if (sB) {
          if (sB.role === "winner") sB.match.nextWinnerMatch = m._id;
          else sB.match.nextLoserMatch = m._id;
        }

        elimMatches.push(m);
        allLBMatches.push(m);
        elimWinnerSlots.push(slot(m, "winner"));
      }
      lbRound++;
      currentLBSlots = elimWinnerSlots;
    } else {
      currentLBSlots = elimSources;
    }
  }

  // Last LB match = LB Final
  if (allLBMatches.length > 0) {
    allLBMatches[allLBMatches.length - 1].roundName = "LB Final";
  }
  const lbFinalMatch = allLBMatches[allLBMatches.length - 1];

  // ── Grand Final ──────────────────────────────────────────────────────
  const gfMatch = mkMatch("grand_final", "Grand Final", 99);

  const allMatches = [...allWBMatches, ...allLBMatches, gfMatch];

  for (const match of allMatches) {
    if (match.isBye && match.winner && match.nextWinnerMatch) {
      const next = allMatches.find(
        (m) => m._id.toString() === match.nextWinnerMatch.toString(),
      );

      if (next) {
        if (!next.teamA) next.teamA = match.winner;
        else if (!next.teamB) next.teamB = match.winner;
      }
    }
  }

  // WB Final winner → GF
  wbFinalMatch.nextWinnerMatch = gfMatch._id;

  // WB Final loser → LB Final
  if (lbFinalMatch) wbFinalMatch.nextLoserMatch = lbFinalMatch._id;

  // LB Final winner → GF
  if (lbFinalMatch) {
    const lbFinalSlot = currentLBSlots[0];
    if (lbFinalSlot) lbFinalSlot.match.nextWinnerMatch = gfMatch._id;
  }

  // ── Return all matches ───────────────────────────────────────────────
  return [...allWBMatches, ...allLBMatches, gfMatch];
}

function seededSlots(size) {
  let slots = [1, 2];
  while (slots.length < size) {
    const next = [];
    const total = slots.length * 2 + 1;
    for (const s of slots) next.push(s, total - s);
    slots = next;
  }
  return slots;
}
//═══════════════════════════════════════════════════════════════════════
// SHARED HELPERS FOR THE COMBINATION FORMATS (work for ANY number of teams)
// ═══════════════════════════════════════════════════════════════════════

function roundLabelByResultCount(count) {
  if (count === 1) return "Final";
  if (count === 2) return "Semifinal";
  if (count === 4) return "Quarterfinal";
  return `Round of ${count * 2}`;
}

function roundRobinPairs(n) {
  const pairs = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) pairs.push([i, j]);
  return pairs;
}

// Snake-seeds teams (already sorted, index0 = top seed) into `numGroups`
// balanced groups, e.g. 1,2,3,4 | 8,7,6,5 | 9,10,11,12 ...
function snakeGroups(teams, numGroups) {
  const groups = Array.from({ length: numGroups }, () => []);
  let dir = 1,
    g = 0;
  for (let i = 0; i < teams.length; i++) {
    groups[g].push(teams[i]);
    if (dir === 1) {
      g++;
      if (g === numGroups) {
        g = numGroups - 1;
        dir = -1;
      }
    } else {
      g--;
      if (g < 0) {
        g = 0;
        dir = 1;
      }
    }
  }
  return groups;
}

// Sensible default group count for any team count n (groups of ~3 teams).
// Admin can override via tournament.numGroups.
function computeGroupCount(n, tournament) {
  if (tournament && tournament.numGroups && tournament.numGroups >= 2) {
    return Math.min(tournament.numGroups, n); // can't have more groups than teams
  }
  if (n <= 4) return Math.min(2, n);
  return Math.max(2, Math.round(n / 3));
}

// Round 1 of a fair, seeded single-knockout bracket built from REAL teams
// (top seeds get BYEs, matching standard tournament seeding rules).
function resolveInitialSlots(slots0, mkMatchFactory) {
  const n0 = slots0.length;
  if (n0 <= 1) return { matches: [], slots: slots0 };
  const size = Math.pow(2, Math.ceil(Math.log2(n0)));
  const pos = seededSlots(size);
  const matches = [];
  const slots = [];
  const nextLen = size / 2;
  for (let i = 0; i < size; i += 2) {
    const aIdx = pos[i],
      bIdx = pos[i + 1];
    const aSlot = aIdx <= n0 ? slots0[aIdx - 1] : null;
    const bSlot = bIdx <= n0 ? slots0[bIdx - 1] : null;
    if (!aSlot && !bSlot) continue;
    const m = mkMatchFactory(roundLabelByResultCount(nextLen));
    if (aSlot && bSlot) {
      m.teamA = aSlot.team._id;
      m.teamB = bSlot.team._id;
      matches.push(m);
      slots.push({ match: m, role: "winner" });
    } else {
      const real = aSlot || bSlot;
      m.isBye = true;
      m.teamA = real.team._id;
      m.winner = real.team._id;
      m.status = "bye";
      matches.push(m);
      slots.push({ team: real.team });
    }
  }
  return { matches, slots };
}

// Places a resolved/unresolved slot into one side of a brand new match.
function wireSlotInto(m, field, slot) {
  if (!slot) return;
  if (slot.team) {
    m[field] = slot.team._id;
  } else if (slot.match) {
    slot.match.nextWinnerMatch = m._id;
  } else if (slot.groupName) {
    m[field === "teamA" ? "sourceGroupA" : "sourceGroupB"] = slot.groupName;
  }
}

// Builds successive knockout rounds from any mix of slot types (real team /
// match-winner / group-winner placeholder) until `stopAtSize` survivors
// remain. Odd numbers of slots simply carry the leftover slot forward
// un-played into the next round (a "free pass").
function growRounds(currentSlots, mkMatchFactory, stopAtSize) {
  const matches = [];
  while (currentSlots.length > stopAtSize) {
    const size = currentSlots.length;
    const nextLen = Math.floor(size / 2) + (size % 2);
    const next = [];
    for (let i = 0; i + 1 < size; i += 2) {
      const m = mkMatchFactory(roundLabelByResultCount(nextLen));
      wireSlotInto(m, "teamA", currentSlots[i]);
      wireSlotInto(m, "teamB", currentSlots[i + 1]);
      matches.push(m);
      next.push({ match: m, role: "winner" });
    }
    if (size % 2 === 1) next.push(currentSlots[size - 1]);
    currentSlots = next;
  }
  return { matches, finalSlots: currentSlots };
}

// Full seeded knockout bracket from real teams, stopping once `stopAtSize`
// survivors remain (stopAtSize=1 → single champion).
function buildKnockoutFromSlots(slots0, mkMatchFactory, stopAtSize) {
  const { matches: r1, slots: s1 } = resolveInitialSlots(
    slots0,
    mkMatchFactory,
  );
  const { matches: rest, finalSlots } = growRounds(
    s1,
    mkMatchFactory,
    stopAtSize,
  );
  return { matches: [...r1, ...rest], finalSlots };
}

function matchFactory(mkBase, stage, bracketType, extra = {}) {
  return (roundName) => mkBase(roundName, bracketType, { stage, ...extra });
}

// ═══════════════════════════════════════════════════════════════════════
// FORMAT 1 — KNOCKOUT CUM LEAGUE (any number of teams)
// Stage 1: seeded single knockout down to the last 4 survivors.
// Stage 2: those 4 qualifiers play a round-robin league; most wins = champion.
// ═══════════════════════════════════════════════════════════════════════
function buildKnockoutCumLeague(teams, tournament) {
  const n = teams.length;
  let mNum = 0;
  const tId = tournament._id,
    venue = tournament.venue,
    date = tournament.startDate;
  const mkBase = (roundName, bracketType, extra = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    tournament: tId,
    matchNumber: ++mNum,
    round: extra.stage === 2 ? 2 : 1,
    roundName,
    bracketType,
    teamA: null,
    teamB: null,
    winner: null,
    loser: null,
    isBye: false,
    status: "scheduled",
    venue,
    scheduledDate: date,
    nextWinnerMatch: null,
    nextLoserMatch: null,
    ...extra,
  });

  const buildLeague = (slots, koMatches) => {
    const pairs = roundRobinPairs(slots.length);
    const leagueMatches = [];
    for (const [i, j] of pairs) {
      const m = mkBase("League Stage", "league", {
        stage: 2,
        stageLabel: "League Stage",
        groupName: null,
        decidesChampion: true,
      });
      const sA = slots[i],
        sB = slots[j];
      if (sA.team) m.teamA = sA.team._id;
      else if (sA.match) m.sourceMatchA = sA.match._id;
      if (sB.team) m.teamB = sB.team._id;
      else if (sB.match) m.sourceMatchB = sB.match._id;
      leagueMatches.push(m);
    }
    return [...koMatches, ...leagueMatches];
  };

  if (n <= 4) {
    return buildLeague(
      teams.map((t) => ({ team: t })),
      [],
    );
  }

  const slots0 = teams.map((t) => ({ team: t }));
  const ko = matchFactory(mkBase, 1, "knockout", {
    stageLabel: "Knockout Stage",
  });
  const { matches: koMatches, finalSlots } = buildKnockoutFromSlots(
    slots0,
    ko,
    4,
  );
  return buildLeague(finalSlots, koMatches);
}

// ═══════════════════════════════════════════════════════════════════════
// FORMAT 2 — LEAGUE CUM KNOCKOUT (any number of teams)
// Stage 1: teams split into balanced (snake-seeded) groups, round-robin league.
// Stage 2: group winners play a single knockout for the title.
// ═══════════════════════════════════════════════════════════════════════
function buildLeagueCumKnockout(teams, tournament) {
  const n = teams.length;
  let mNum = 0;
  const tId = tournament._id,
    venue = tournament.venue,
    date = tournament.startDate;
  const mkBase = (roundName, bracketType, extra = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    tournament: tId,
    matchNumber: ++mNum,
    round: extra.stage === 2 ? 2 : 1,
    roundName,
    bracketType,
    teamA: null,
    teamB: null,
    winner: null,
    loser: null,
    isBye: false,
    status: "scheduled",
    venue,
    scheduledDate: date,
    nextWinnerMatch: null,
    nextLoserMatch: null,
    ...extra,
  });

  const numGroups = computeGroupCount(n, tournament);
  const groups = snakeGroups(teams, numGroups);
  const groupNames = groups.map(
    (_, i) => `Group ${String.fromCharCode(65 + i)}`,
  );

  const leagueMatches = [];
  groups.forEach((g, gi) => {
    const pairs = roundRobinPairs(g.length);
    for (const [i, j] of pairs) {
      const m = mkBase(`${groupNames[gi]} - League`, "league", {
        stage: 1,
        stageLabel: "League Stage",
        groupName: groupNames[gi],
      });
      m.teamA = g[i]._id;
      m.teamB = g[j]._id;
      leagueMatches.push(m);
    }
  });

  const slots0 = groupNames.map((gn) => ({ groupName: gn }));
  const ko = matchFactory(mkBase, 2, "knockout", {
    stageLabel: "Knockout Stage",
  });
  const { matches: koMatches } = growRounds(slots0, ko, 1);
  if (koMatches.length) koMatches[koMatches.length - 1].decidesChampion = true;

  return [...leagueMatches, ...koMatches];
}

// ═══════════════════════════════════════════════════════════════════════
// FORMAT 3 — KNOCKOUT CUM KNOCKOUT (any number of teams)
// Stage 1: teams split into balanced (snake-seeded) groups, each group runs
//          its own seeded single knockout.
// Stage 2: the group winners play a single knockout final stage.
// ═══════════════════════════════════════════════════════════════════════
function buildKnockoutCumKnockout(teams, tournament) {
  const n = teams.length;
  let mNum = 0;
  const tId = tournament._id,
    venue = tournament.venue,
    date = tournament.startDate;
  const mkBase = (roundName, bracketType, extra = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    tournament: tId,
    matchNumber: ++mNum,
    round: extra.stage === 2 ? 2 : 1,
    roundName,
    bracketType,
    teamA: null,
    teamB: null,
    winner: null,
    loser: null,
    isBye: false,
    status: "scheduled",
    venue,
    scheduledDate: date,
    nextWinnerMatch: null,
    nextLoserMatch: null,
    ...extra,
  });

  const numGroups = computeGroupCount(n, tournament);
  const groups = snakeGroups(teams, numGroups);
  const groupNames = groups.map(
    (_, i) => `Group ${String.fromCharCode(65 + i)}`,
  );

  let allMatches = [];
  const groupFinalSlots = [];
  groups.forEach((g, gi) => {
    const slots0 = g.map((t) => ({ team: t }));
    const ko = matchFactory(mkBase, 1, "knockout", {
      stageLabel: "Group Knockout",
      groupName: groupNames[gi],
    });
    const { matches, finalSlots } = buildKnockoutFromSlots(
      slots0,
      (rn) => ko(`${groupNames[gi]} - ${rn}`),
      1,
    );
    allMatches.push(...matches);
    groupFinalSlots.push(finalSlots[0]);
  });

  const ko2 = matchFactory(mkBase, 2, "knockout", {
    stageLabel: "Final Knockout Stage",
  });
  const { matches: koMatches } = growRounds(groupFinalSlots, ko2, 1);
  if (koMatches.length) koMatches[koMatches.length - 1].decidesChampion = true;
  allMatches.push(...koMatches);

  return allMatches;
}

// ── Generic slot filler: places `teamId` into the first open slot of the
// target match, resolving the match immediately if it turns out to be a
// (still-unresolved) BYE, and cascading that resolution onward.
async function fillSlot(matchId, teamId) {
  const m = await Match.findById(matchId);
  if (!m) return;
  if (!m.teamA) m.teamA = teamId;
  else if (!m.teamB) m.teamB = teamId;

  if (m.isBye && !m.winner) {
    const only =
      m.teamA && !m.teamB ? m.teamA : m.teamB && !m.teamA ? m.teamB : null;
    if (only) {
      m.winner = only;
      m.status = "bye";
    }
  }
  await m.save();

  if (m.isBye && m.winner && m.nextWinnerMatch) {
    await fillSlot(m.nextWinnerMatch, m.winner);
  }
}

// ── Combination-format propagation ────────────────────────────────────
// Handles two situations that plain nextWinnerMatch wiring can't:
//  1) sourceMatchA/B — a later match (e.g. a league fixture) needs the
//     WINNER of an earlier match as one of its teams (used when the same
//     qualifier plays several league games, so simple 1:1 "next match"
//     wiring doesn't apply).
//  2) sourceGroupA/B — a later knockout match needs the winner of an
//     entire group/league (determined only once every match in that
//     group is complete).
async function propagateCombinationResults(match) {
  // 1) Direct match-winner → match-slot propagation
  const dependents = await Match.find({
    tournament: match.tournament,
    $or: [{ sourceMatchA: match._id }, { sourceMatchB: match._id }],
  });
  for (const dep of dependents) {
    if (
      dep.sourceMatchA &&
      dep.sourceMatchA.toString() === match._id.toString()
    )
      dep.teamA = match.winner;
    if (
      dep.sourceMatchB &&
      dep.sourceMatchB.toString() === match._id.toString()
    )
      dep.teamB = match.winner;
    await dep.save();
  }

  // 2) Group/league completion → group-winner propagation
  if (match.groupName && match.bracketType === "league") {
    const groupMatches = await Match.find({
      tournament: match.tournament,
      groupName: match.groupName,
      bracketType: "league",
    });
    const allDone = groupMatches.every(
      (m) => m.status === "completed" || m.status === "bye",
    );
    if (allDone) {
      const wins = {};
      const teamIds = new Set();
      for (const m of groupMatches) {
        if (m.teamA) teamIds.add(m.teamA.toString());
        if (m.teamB) teamIds.add(m.teamB.toString());
        if (m.winner)
          wins[m.winner.toString()] = (wins[m.winner.toString()] || 0) + 1;
      }
      let best = null,
        bestWins = -1;
      teamIds.forEach((id) => {
        const w = wins[id] || 0;
        if (w > bestWins) {
          bestWins = w;
          best = id;
        }
      });

      if (best) {
        const groupDeps = await Match.find({
          tournament: match.tournament,
          $or: [
            { sourceGroupA: match.groupName },
            { sourceGroupB: match.groupName },
          ],
        });
        for (const dep of groupDeps) {
          if (dep.sourceGroupA === match.groupName) dep.teamA = best;
          if (dep.sourceGroupB === match.groupName) dep.teamB = best;

          if (dep.isBye && !dep.winner) {
            const only =
              dep.teamA && !dep.teamB
                ? dep.teamA
                : dep.teamB && !dep.teamA
                  ? dep.teamB
                  : null;
            if (only) {
              dep.winner = only;
              dep.status = "bye";
            }
          }
          await dep.save();

          if (dep.isBye && dep.winner && dep.nextWinnerMatch) {
            await fillSlot(dep.nextWinnerMatch, dep.winner);
          }
        }
      }
    }
  }

  // 3) Final league stage (Knockout cum League) → crown the champion
  if (match.bracketType === "league" && match.decidesChampion) {
    const finalLeagueMatches = await Match.find({
      tournament: match.tournament,
      bracketType: "league",
      decidesChampion: true,
    });
    const allDone = finalLeagueMatches.every(
      (m) => m.status === "completed" || m.status === "bye",
    );
    if (allDone) {
      const wins = {};
      const teamIds = new Set();
      for (const m of finalLeagueMatches) {
        if (m.teamA) teamIds.add(m.teamA.toString());
        if (m.teamB) teamIds.add(m.teamB.toString());
        if (m.winner)
          wins[m.winner.toString()] = (wins[m.winner.toString()] || 0) + 1;
      }
      let best = null,
        bestWins = -1;
      teamIds.forEach((id) => {
        const w = wins[id] || 0;
        if (w > bestWins) {
          bestWins = w;
          best = id;
        }
      });
      if (best) {
        await Team.findByIdAndUpdate(best, { bracket: "champion" });
        for (const id of teamIds) {
          if (id !== best)
            await Team.findByIdAndUpdate(id, { bracket: "eliminated" });
        }
        await Tournament.findByIdAndUpdate(match.tournament, {
          status: "completed",
        });
      }
    }
  }

  // 4) Group knockout completion (Knockout cum Knockout) → advance group winner to Stage 2
  if (
    match.bracketType === "knockout" &&
    match.groupName &&
    match.stage === 1
  ) {
    const groupKOMatches = await Match.find({
      tournament: match.tournament,
      bracketType: "knockout",
      groupName: match.groupName,
      stage: 1,
    });
    const allDone = groupKOMatches.every(
      (m) => m.status === "completed" || m.status === "bye",
    );
    if (allDone) {
      const sorted = groupKOMatches.sort(
        (a, b) => b.matchNumber - a.matchNumber,
      );
      const groupWinner = sorted.find((m) => m.winner)?.winner;
      if (groupWinner) {
        const groupDeps = await Match.find({
          tournament: match.tournament,
          $or: [
            { sourceGroupA: match.groupName },
            { sourceGroupB: match.groupName },
          ],
        });
        for (const dep of groupDeps) {
          if (dep.sourceGroupA === match.groupName) dep.teamA = groupWinner;
          if (dep.sourceGroupB === match.groupName) dep.teamB = groupWinner;
          if (dep.isBye && !dep.winner) {
            const only =
              dep.teamA && !dep.teamB
                ? dep.teamA
                : dep.teamB && !dep.teamA
                  ? dep.teamB
                  : null;
            if (only) {
              dep.winner = only;
              dep.status = "bye";
            }
          }
          await dep.save();
          if (dep.isBye && dep.winner && dep.nextWinnerMatch)
            await fillSlot(dep.nextWinnerMatch, dep.winner);
        }
      }
    }
  }
}

module.exports = router;
