const express = require('express');
const mongoose = require('mongoose');
const Match = require('../models/Match');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const { adminAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/tournament/:tournamentId', async (req, res) => {
  try {
    const matches = await Match.find({ tournament: req.params.tournamentId })
      .populate('teamA', 'teamName captainName seed points')
      .populate('teamB', 'teamName captainName seed points')
      .populate('winner', 'teamName')
      .populate('loser', 'teamName')
      .sort({ matchNumber: 1 });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/generate/:tournamentId', adminAuth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    const teams = await Team.find({ tournament: req.params.tournamentId, status: 'approved' })
      .sort({ points: -1, createdAt: 1 });

    if (teams.length < 2) return res.status(400).json({ message: 'Need at least 2 approved teams' });

    await Match.deleteMany({ tournament: req.params.tournamentId });

    for (let i = 0; i < teams.length; i++) {
      await Team.findByIdAndUpdate(teams[i]._id, { seed: i + 1, wins: 0, losses: 0, bracket: 'pending' });
      teams[i].seed = i + 1;
    }

    const matches = buildDKO(teams, tournament);
    await Match.insertMany(matches);
    await Tournament.findByIdAndUpdate(req.params.tournamentId, { status: 'fixture_generated' });
    res.json({ message: 'Fixture generated', matches: matches.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/score', adminAuth, async (req, res) => {
  try {
    const { teamAScore, teamBScore, winnerId, status, notes } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    if (match.isBye) return res.status(400).json({ message: 'Bye matches cannot be scored' });

    if (teamAScore) match.teamAScore = teamAScore;
    if (teamBScore) match.teamBScore = teamBScore;
    match.status = status || 'completed';
    if (notes !== undefined) match.notes = notes;

    if (winnerId && match.status === 'completed') {
      const teamAId = match.teamA?.toString();
      const teamBId = match.teamB?.toString();
      if (!teamAId || !teamBId) return res.status(400).json({ message: 'Match does not have two teams yet' });

      const loserId = teamAId === winnerId ? teamBId : teamAId;
      match.winner = winnerId;
      match.loser = loserId;

      await Team.findByIdAndUpdate(winnerId, { $inc: { wins: 1 } });
      await Team.findByIdAndUpdate(loserId, { $inc: { losses: 1 } });

      if (match.bracketType === 'winners') {
        await Team.findByIdAndUpdate(winnerId, { bracket: 'winners' });
        await Team.findByIdAndUpdate(loserId, { bracket: 'losers' });
      }
       else if (match.bracketType === 'losers') {
        await Team.findByIdAndUpdate(winnerId, { bracket: 'losers' });
        await Team.findByIdAndUpdate(loserId, { bracket: 'eliminated' });
      } else {
        await Team.findByIdAndUpdate(winnerId, { bracket: 'champion' });
        await Team.findByIdAndUpdate(loserId, { bracket: 'eliminated' });
      }

      if (match.nextWinnerMatch) {
        const nwm = await Match.findById(match.nextWinnerMatch);
        if (nwm) {
          if (!nwm.teamA) nwm.teamA = winnerId;
          else if (!nwm.teamB) nwm.teamB = winnerId;
          await nwm.save();
        }
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
    await Tournament.findByIdAndUpdate(match.tournament, { status: 'ongoing' });

    const updated = await Match.findById(match._id)
      .populate('teamA', 'teamName')
      .populate('teamB', 'teamName')
      .populate('winner', 'teamName')
      .populate('loser', 'teamName');
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', adminAuth, async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('teamA', 'teamName').populate('teamB', 'teamName');
    if (!match) return res.status(404).json({ message: 'Match not found' });
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
    status: 'scheduled',
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
  const wbR1LoserSlots  = []; // slots feeding into LB R1

  for (let i = 0; i < size; i += 2) {
    const seedA = seedPos[i];
    const seedB = seedPos[i + 1];
    const teamA = seedA <= n ? teams[seedA - 1] : null;
    const teamB = seedB <= n ? teams[seedB - 1] : null;

    const m = mkMatch('winners', 'WB Round 1', 1);

    if (teamA && teamB) {
      // Real match
      m.teamA = teamA._id;
      m.teamB = teamB._id;
      wbR1Matches.push(m);
      wbR1WinnerSlots.push(slot(m, 'winner'));
      wbR1LoserSlots.push(slot(m, 'loser'));
    } else {
      // Bye: one real team, auto advances
      const realTeam = teamA || teamB;
      m.teamA = realTeam._id;
      m.isBye = true;
      m.status = 'bye';
      m.winner = realTeam._id;
      wbR1Matches.push(m);
      // Winner slot pre-filled with real team
      wbR1WinnerSlots.push(slot(m, 'winner', realTeam));
      // No loser slot for byes
    }
  }

  // ── WB subsequent rounds ─────────────────────────────────────────────
  // wbRoundSlots[r] = array of winner-slots entering round r+2
  // wbRoundMatches[r] = array of matches in WB round r+2
  // wbRoundLoserSlots[r] = loser slots from WB round r+2

  const allWBMatches   = [...wbR1Matches];
  const wbRoundSlots   = [wbR1WinnerSlots]; // index 0 = slots that produce WB R2 inputs
  const wbRoundLosers  = [wbR1LoserSlots];  // index 0 = WB R1 loser slots → LB R1

  let wbRound = 2;
  let currentWBSlots = wbR1WinnerSlots;

  while (currentWBSlots.length > 1) {
    const isWBFinal = currentWBSlots.length === 2;
    const rName = isWBFinal ? 'WB Final' : `WB Round ${wbRound}`;
    const nextWBSlots    = [];
    const thisRoundLosers = [];
    const thisRoundMatches = [];

    for (let i = 0; i < currentWBSlots.length; i += 2) {
      const slotA = currentWBSlots[i];
      const slotB = currentWBSlots[i + 1];
      const m = mkMatch('winners', rName, wbRound);

      // Pre-fill known bye-advancers
      // if (slotA.team) m.teamA = slotA.team._id;
      // if (slotB && slotB.team) m.teamB = slotB.team._id;

if (slotA.team && slotB?.team) {
  m.teamA = slotA.team._id;
  m.teamB = slotB.team._id;
}


      // Wire: slotA.match winner/loser → this match's teamA
      if (slotA.role === 'winner') slotA.match.nextWinnerMatch = m._id;
      else slotA.match.nextLoserMatch = m._id;

      if (slotB) {
        if (slotB.role === 'winner') slotB.match.nextWinnerMatch = m._id;
        else slotB.match.nextLoserMatch = m._id;
      }

      thisRoundMatches.push(m);
      allWBMatches.push(m);
      nextWBSlots.push(slot(m, 'winner'));
      thisRoundLosers.push(slot(m, 'loser'));
    }

    wbRoundSlots.push(nextWBSlots);
    wbRoundLosers.push(thisRoundLosers);
    currentWBSlots = nextWBSlots;
    wbRound++;
  }

  // WB Final match
  const wbFinalMatch = allWBMatches[allWBMatches.length - 1];
  const wbFinalWinnerSlot = slot(wbFinalMatch, 'winner');
  const wbFinalLoserSlot  = slot(wbFinalMatch, 'loser');

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
      const m = mkMatch('losers', 'LB Round 1', lbRound);

      sA.match.nextLoserMatch = m._id;
      sB.match.nextLoserMatch = m._id;

      lb1Matches.push(m);
      allLBMatches.push(m);
      currentLBSlots.push(slot(m, 'winner'));
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
    const feedRName = (isLastWBRound && pairCount === 1) ? 'LB Final' : `LB Round ${lbRound}`;
    const feedMatches = [];
    const feedWinnerSlots = [];
    const carrySlots = [];

    for (let i = 0; i < pairCount; i++) {
      const lbSurvivorSlot = currentLBSlots[i] || currentLBSlots[0];
      const wbLoserSlot    = wbLosers[i];
      const m = mkMatch('losers', feedRName, lbRound);

      // Wire LB survivor into this match
      if (lbSurvivorSlot.role === 'winner') lbSurvivorSlot.match.nextWinnerMatch = m._id;
      else lbSurvivorSlot.match.nextLoserMatch = m._id;

      // Wire WB loser into this match
      wbLoserSlot.match.nextLoserMatch = m._id;

      feedMatches.push(m);
      allLBMatches.push(m);
      feedWinnerSlots.push(slot(m, 'winner'));
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
      const elimRName = (isLastWBRound && elimCount === 1) ? 'LB Final' : `LB Round ${lbRound}`;
      const elimMatches = [];
      const elimWinnerSlots = [];

      for (let i = 0; i < elimSources.length; i += 2) {
        const sA = elimSources[i];
        const sB = elimSources[i + 1];
        const m = mkMatch('losers', elimRName, lbRound);

        if (sA.role === 'winner') sA.match.nextWinnerMatch = m._id;
        else sA.match.nextLoserMatch = m._id;

        if (sB) {
          if (sB.role === 'winner') sB.match.nextWinnerMatch = m._id;
          else sB.match.nextLoserMatch = m._id;
        }

        elimMatches.push(m);
        allLBMatches.push(m);
        elimWinnerSlots.push(slot(m, 'winner'));
      }
      lbRound++;
      currentLBSlots = elimWinnerSlots;
    } else {
      currentLBSlots = elimSources;
    }
  }

  // Last LB match = LB Final
  if (allLBMatches.length > 0) {
    allLBMatches[allLBMatches.length - 1].roundName = 'LB Final';
  }
  const lbFinalMatch = allLBMatches[allLBMatches.length - 1];

  // ── Grand Final ──────────────────────────────────────────────────────
  const gfMatch = mkMatch('grand_final', 'Grand Final', 99);


const allMatches = [...allWBMatches, ...allLBMatches, gfMatch];

for (const match of allMatches) {
  if (
    match.isBye &&
    match.winner &&
    match.nextWinnerMatch
  ) {
    const next = allMatches.find(
      m => m._id.toString() === match.nextWinnerMatch.toString()
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

module.exports = router;
