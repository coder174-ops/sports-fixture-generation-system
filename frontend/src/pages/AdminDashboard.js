import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { tournamentAPI, teamAPI, matchAPI } from "../utils/api";
import { useAuth } from "../context/AuthContext";

const sports = [
  "cricket",
  "football",
  "basketball",
  "badminton",
  "tennis",
  "volleyball",
  "other",
];

const AdminDashboard = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("tournaments");
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTModal, setShowTModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [tForm, setTForm] = useState({
    name: "",
    sport: "cricket",
    format: "double_knockout",
    maxTeams: 8,
    playersPerTeam: 11,
    venue: "",
    startDate: "",
    endDate: "",
    overs: 20,
    description: "",
    registrationDeadline: "",
    prizeInfo: "",
    status: "registration_open",
  });

  const [scoreForm, setScoreForm] = useState({
    teamAScore: { runs: 0, wickets: 0, overs: 0, extras: 0 },
    teamBScore: { runs: 0, wickets: 0, overs: 0, extras: 0 },
    winnerId: "",
    status: "completed",
    notes: "",
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    fetchAll();
  }, [isAdmin]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [t, tm] = await Promise.all([
        tournamentAPI.getAll(),
        teamAPI.getAll(),
      ]);
      setTournaments(t.data);
      setTeams(tm.data);
    } catch {}
    setLoading(false);
  };

  const fetchMatchesForTournament = async (tId) => {
    const m = await matchAPI.getByTournament(tId);
    setMatches(m.data);
    setSelectedTournament(tId);
    setTab("matches");
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      await tournamentAPI.create(tForm);
      setMsg("Tournament created!");
      setShowTModal(false);
      await fetchAll();
      setTForm({
        name: "",
        sport: "cricket",
        maxTeams: 8,
        playersPerTeam: 11,
        venue: "",
        startDate: "",
        endDate: "",
        overs: 20,
        description: "",
        registrationDeadline: "",
        prizeInfo: "",
        status: "registration_open",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Error");
    }
  };

  const handleApproveTeam = async (teamId, status) => {
    try {
      await teamAPI.updateStatus(teamId, { status });
      await fetchAll();
      setMsg(`Team ${status}!`);
    } catch (err) {
      setError("Error updating team");
    }
  };

  const handleGenerateFixture = async (tId) => {
    // if (
    //   !window.confirm(
    //     "Generate double knockout fixture? This will delete existing matches.",
    //   )
    // )
    //   return;

  const t = tournaments.find(t => t._id === tId);

  const formatLabel =
  t?.format === 'single_knockout'
    ? 'single knockout'
    : 'double knockout';

 if (
  !window.confirm(
    `Generate ${formatLabel} fixture? This will delete existing matches.`
  )
) return;

    try {
      const res = await matchAPI.generate(tId);
      setMsg(`Fixture generated: ${res.data.matches} matches created!`);
      await fetchMatchesForTournament(tId);
    } catch (err) {
      setError(err.response?.data?.message || "Error generating fixture");
    }
  };

  const handleUpdateTournamentStatus = async (tId, status) => {
    try {
      await tournamentAPI.update(tId, { status });
      await fetchAll();
      setMsg("Status updated!");
    } catch {}
  };

  const handleUpdateScore = async (e) => {
    e.preventDefault();
    setError("");
    if (!scoreForm.winnerId)
      return setError("Please select a winner before saving");
    try {
      await matchAPI.updateScore(showScoreModal._id, scoreForm);
      setMsg("Score updated! Teams auto-advanced to next match.");
      setShowScoreModal(null);
      if (selectedTournament)
        await fetchMatchesForTournament(selectedTournament);
    } catch (err) {
      setError(err.response?.data?.message || "Error updating score");
    }
  };

  const openScoreModal = (match) => {
    setShowScoreModal(match);
    setScoreForm({
      teamAScore: match.teamAScore || {
        runs: 0,
        wickets: 0,
        overs: 0,
        extras: 0,
      },
      teamBScore: match.teamBScore || {
        runs: 0,
        wickets: 0,
        overs: 0,
        extras: 0,
      },
      winnerId: match.winner?._id || "",
      status: match.status === "completed" ? "completed" : "live",
      notes: match.notes || "",
    });
  };

  const pendingTeams = teams.filter((t) => t.status === "pending");
  const tabs = [
    { key: "tournaments", label: "🏟️ Tournaments", count: tournaments.length },
    { key: "teams", label: "👥 Teams", count: teams.length },
    {
      key: "pending",
      label: "⏳ Pending Approval",
      count: pendingTeams.length,
      highlight: pendingTeams.length > 0,
    },
    { key: "matches", label: "📅 Matches", count: matches.length },
  ];

  if (!isAdmin) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="section-title">⚙️ Admin Dashboard</h1>
        <p className="section-subtitle">
          Manage tournaments, teams, and match results
        </p>
      </div>

      {msg && (
        <div
          className="alert alert-success"
          onClick={() => setMsg("")}
          style={{ cursor: "pointer" }}
        >
          ✅ {msg} (click to dismiss)
        </div>
      )}
      {error && (
        <div
          className="alert alert-error"
          onClick={() => setError("")}
          style={{ cursor: "pointer" }}
        >
          ❌ {error} (click to dismiss)
        </div>
      )}

      {/* Stats row */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        {[
          {
            label: "Tournaments",
            value: tournaments.length,
            color: "var(--accent-gold)",
            icon: "🏆",
          },
          {
            label: "Total Teams",
            value: teams.length,
            color: "var(--accent-blue)",
            icon: "👥",
          },
          {
            label: "Pending Approval",
            value: pendingTeams.length,
            color: "var(--accent-red)",
            icon: "⏳",
          },
          {
            label: "Matches",
            value: matches.length,
            color: "var(--accent-green)",
            icon: "📅",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="card"
            style={{ borderTop: `2px solid ${stat.color}` }}
          >
            <div style={{ fontSize: "1.6rem", marginBottom: 6 }}>
              {stat.icon}
            </div>
            <div
              style={{
                fontFamily: "Bebas Neue",
                fontSize: "2rem",
                color: stat.color,
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 24,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            style={{
              padding: "10px 16px",
              background: "none",
              border: "none",
              borderBottom:
                tab === t.key
                  ? "2px solid var(--accent-gold)"
                  : "2px solid transparent",
              color:
                tab === t.key ? "var(--accent-gold)" : "var(--text-secondary)",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.875rem",
              fontFamily: "Inter",
              transition: "color 0.2s",
              marginBottom: -1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.count > 0 && (
              <span
                style={{
                  background: t.highlight
                    ? "var(--accent-red)"
                    : "var(--bg-card-hover)",
                  color: t.highlight ? "white" : "var(--text-secondary)",
                  borderRadius: 10,
                  padding: "1px 6px",
                  fontSize: "0.7rem",
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tournaments Tab */}
      {tab === "tournaments" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 16,
            }}
          >
            <button
              className="btn btn-primary"
              onClick={() => setShowTModal(true)}
            >
              + Create Tournament
            </button>
          </div>
          <div className="card">
            {tournaments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏟️</div>
                <div className="empty-state-title">No tournaments yet</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tournament</th>
                      <th>Sport</th>
                      <th>Teams</th>
                      <th>Venue</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournaments.map((t) => {
                      const approvedCount = teams.filter(
                        (tm) =>
                          tm.tournament?._id === t._id &&
                          tm.status === "approved",
                      ).length;
                      return (
                        <tr key={t._id}>
                          <td style={{ fontWeight: 600 }}>{t.name}</td>
                          <td>
                            <span className="badge badge-blue">{t.sport}</span>
                          </td>
                          <td style={{ color: "var(--text-secondary)" }}>
                            {approvedCount}/{t.maxTeams}
                          </td>
                          <td
                            style={{
                              color: "var(--text-secondary)",
                              fontSize: "0.82rem",
                            }}
                          >
                            {t.venue}
                          </td>
                          <td>
                            <select
                              className="form-select"
                              style={{
                                fontSize: "0.75rem",
                                padding: "4px 8px",
                              }}
                              value={t.status}
                              onChange={(e) =>
                                handleUpdateTournamentStatus(
                                  t._id,
                                  e.target.value,
                                )
                              }
                            >
                              {[
                                "upcoming",
                                "registration_open",
                                "registration_closed",
                                "fixture_generated",
                                "ongoing",
                                "completed",
                              ].map((s) => (
                                <option key={s} value={s}>
                                  {s.replace(/_/g, " ")}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                flexWrap: "wrap",
                              }}
                            >
                              <Link
                                to={`/tournaments/${t._id}`}
                                className="btn btn-secondary btn-sm"
                              >
                                View
                              </Link>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleGenerateFixture(t._id)}
                              >
                                ⚡ Generate Fixture
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => fetchMatchesForTournament(t._id)}
                              >
                                📅 Matches
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* All Teams Tab */}
      {tab === "teams" && (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Tournament</th>
                  <th>Captain</th>
                  <th>Players</th>
                  <th>Points</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team._id}>
                    <td style={{ fontWeight: 600 }}>{team.teamName}</td>
                    <td
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {team.tournament?.name}
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {team.captainName}
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {team.players?.length || 0}
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-input"
                        style={{
                          width: 70,
                          padding: "4px 8px",
                          fontSize: "0.8rem",
                        }}
                        defaultValue={team.points || 0}
                        onBlur={(e) =>
                          teamAPI.update(team._id, {
                            points: parseInt(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td>
                      <span
                        className={`badge ${team.status === "approved" ? "badge-green" : team.status === "rejected" ? "badge-red" : "badge-gray"}`}
                      >
                        {team.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        {team.status === "pending" && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() =>
                                handleApproveTeam(team._id, "approved")
                              }
                            >
                              ✓ Approve
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() =>
                                handleApproveTeam(team._id, "rejected")
                              }
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}
                        {team.status !== "pending" && (
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            —
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Approval Tab */}
      {tab === "pending" && (
        <div>
          {pendingTeams.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-title">No pending teams</div>
              <div className="empty-state-desc">
                All team registrations have been processed
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {pendingTeams.map((team) => (
                <div
                  key={team._id}
                  className="card"
                  style={{ borderLeft: "3px solid var(--accent-gold)" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontWeight: 700,
                          fontSize: "1.05rem",
                          color: "var(--text-primary)",
                          marginBottom: 4,
                        }}
                      >
                        {team.teamName}
                      </h3>
                      <p
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-secondary)",
                          marginBottom: 2,
                        }}
                      >
                        🏆 {team.tournament?.name} ({team.tournament?.sport})
                      </p>
                      <p
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-secondary)",
                          marginBottom: 2,
                        }}
                      >
                        👤 Captain: {team.captainName}
                      </p>
                      {team.captainContact && (
                        <p
                          style={{
                            fontSize: "0.82rem",
                            color: "var(--text-secondary)",
                            marginBottom: 2,
                          }}
                        >
                          📞 {team.captainContact}
                        </p>
                      )}
                      {team.captainEmail && (
                        <p
                          style={{
                            fontSize: "0.82rem",
                            color: "var(--text-secondary)",
                            marginBottom: 2,
                          }}
                        >
                          ✉️ {team.captainEmail}
                        </p>
                      )}
                      <p
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        👥 {team.players?.length || 0} players registered • 🏅{" "}
                        {team.points || 0} pts
                      </p>
                      {team.players?.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <p
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                              marginBottom: 4,
                            }}
                          >
                            Players:
                          </p>
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            {team.players.map((p, i) => (
                              <span key={i} className="badge badge-gray">
                                {p.name}
                                {p.role ? ` (${p.role})` : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn btn-success"
                        onClick={() => handleApproveTeam(team._id, "approved")}
                      >
                        ✓ Approve
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleApproveTeam(team._id, "rejected")}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Matches Tab */}
      {tab === "matches" && (
        <div>
          {!selectedTournament ? (
            <div className="empty-state card">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-title">
                Select a tournament to view matches
              </div>
              <div className="empty-state-desc">
                Go to Tournaments tab and click "Matches"
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                    {
                      tournaments.find((t) => t._id === selectedTournament)
                        ?.name
                    }
                  </h3>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    Complete matches in order — winner/loser auto-advance to
                    next match
                  </p>
                </div>
                <button
                  className="btn btn-success"
                  onClick={() => handleGenerateFixture(selectedTournament)}
                >
                  ⚡ Regenerate Fixture
                </button>
              </div>

              {matches.length === 0 ? (
                <div className="empty-state card">
                  <div className="empty-state-icon">📅</div>
                  <div className="empty-state-title">
                    No matches yet — generate fixture first
                  </div>
                </div>
              ) : (
                <>
                  {/* Legend */}
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginBottom: 20,
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="badge badge-gold">🥇 Winners Bracket</span>
                    <span className="badge badge-blue">🔁 Losers Bracket</span>
                    <span className="badge badge-purple">🏆 Grand Final</span>
                    <span className="badge badge-green">✅ Completed</span>
                    <span className="badge badge-gray">
                      ⏳ Waiting for teams
                    </span>
                  </div>

                  {/* Group by bracket section */}
                  {[
                    {
                      label: "🥇 Winners Bracket",
                      type: "winners",
                      color: "var(--accent-gold)",
                      cls: "badge-gold",
                    },
                    {
                      label: "🔁 Losers Bracket",
                      type: "losers",
                      color: "var(--accent-blue)",
                      cls: "badge-blue",
                    },
                    {
                      label: "🏆 Grand Final",
                      type: "grand_final",
                      color: "var(--accent-purple)",
                      cls: "badge-purple",
                    },
                  ].map(({ label, type, color, cls }) => {
                    const section = matches.filter(
                      (m) => m.bracketType === type,
                    );
                    if (section.length === 0) return null;
                    return (
                      <div key={type} style={{ marginBottom: 28 }}>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color,
                            marginBottom: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {label}
                          <span
                            style={{
                              fontSize: "0.7rem",
                              color: "var(--text-muted)",
                              fontWeight: 400,
                              textTransform: "none",
                            }}
                          >
                            (
                            {
                              section.filter(
                                (m) =>
                                  m.status === "completed" ||
                                  m.status === "bye",
                              ).length
                            }
                            /{section.length} done)
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                          }}
                        >
                          {section.map((match) => {
                            const hasBothTeams = match.teamA && match.teamB;
                            const isReady =
                              hasBothTeams &&
                              match.status !== "completed" &&
                              match.status !== "bye";
                            const isDone =
                              match.status === "completed" ||
                              match.status === "bye";
                            return (
                              <div
                                key={match._id}
                                className="card"
                                style={{
                                  borderLeft: `3px solid ${color}`,
                                  padding: "14px 18px",
                                  opacity: isDone ? 0.75 : 1,
                                  background: isReady
                                    ? "var(--bg-card-hover)"
                                    : "var(--bg-card)",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 12,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <div style={{ flex: 1 }}>
                                    {/* Header row */}
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: 8,
                                        marginBottom: 10,
                                        flexWrap: "wrap",
                                        alignItems: "center",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontFamily: "JetBrains Mono",
                                          fontSize: "0.72rem",
                                          color: "var(--text-muted)",
                                          background: "var(--bg-secondary)",
                                          padding: "2px 8px",
                                          borderRadius: 4,
                                          fontWeight: 700,
                                        }}
                                      >
                                        M{match.matchNumber}
                                      </span>
                                      <span
                                        className={`badge ${cls}`}
                                        style={{ fontSize: "0.68rem" }}
                                      >
                                        {match.roundName}
                                      </span>
                                      <span
                                        className={`badge ${isDone ? (match.isBye ? "badge-blue" : "badge-green") : isReady ? "badge-gold" : "badge-gray"}`}
                                        style={{ fontSize: "0.68rem" }}
                                      >
                                        {match.isBye
                                          ? "BYE"
                                          : isDone
                                            ? "COMPLETED"
                                            : isReady
                                              ? "▶ READY"
                                              : "⏳ WAITING"}
                                      </span>
                                    </div>

                                    {/* Match content */}
                                    {match.isBye ? (
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 10,
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontWeight: 700,
                                            color: "var(--text-primary)",
                                            fontSize: "1rem",
                                          }}
                                        >
                                          {match.teamA?.teamName || "TBD"}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: "0.8rem",
                                            color: "var(--accent-blue)",
                                          }}
                                        >
                                          → Auto advances (BYE)
                                        </span>
                                      </div>
                                    ) : (
                                      <div
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns: "1fr auto 1fr",
                                          alignItems: "center",
                                          gap: 10,
                                        }}
                                      >
                                        {/* Team A */}
                                        <div>
                                          <div
                                            style={{
                                              fontWeight:
                                                match.winner?._id ===
                                                match.teamA?._id
                                                  ? 800
                                                  : 500,
                                              color:
                                                match.winner?._id ===
                                                match.teamA?._id
                                                  ? color
                                                  : match.teamA
                                                    ? "var(--text-primary)"
                                                    : "var(--text-muted)",
                                              fontSize: "0.95rem",
                                              fontStyle: match.teamA
                                                ? "normal"
                                                : "italic",
                                            }}
                                          >
                                            {match.winner?._id ===
                                              match.teamA?._id && "🏆 "}
                                            {match.teamA?.teamName ||
                                              "TBD — waiting for result"}
                                          </div>
                                          {isDone &&
                                            match.teamAScore &&
                                            match.teamAScore.runs > 0 && (
                                              <div
                                                style={{
                                                  fontFamily: "JetBrains Mono",
                                                  fontSize: "0.82rem",
                                                  color,
                                                  marginTop: 2,
                                                }}
                                              >
                                                {match.teamAScore.runs}/
                                                {match.teamAScore.wickets} (
                                                {match.teamAScore.overs} ov)
                                              </div>
                                            )}
                                        </div>
                                        {/* VS */}
                                        <div
                                          style={{
                                            textAlign: "center",
                                            color: "var(--text-muted)",
                                            fontWeight: 700,
                                            fontSize: "0.78rem",
                                            padding: "6px 12px",
                                            background: "var(--bg-secondary)",
                                            borderRadius: 6,
                                          }}
                                        >
                                          VS
                                        </div>
                                        {/* Team B */}
                                        <div style={{ textAlign: "right" }}>
                                          <div
                                            style={{
                                              fontWeight:
                                                match.winner?._id ===
                                                match.teamB?._id
                                                  ? 800
                                                  : 500,
                                              color:
                                                match.winner?._id ===
                                                match.teamB?._id
                                                  ? color
                                                  : match.teamB
                                                    ? "var(--text-primary)"
                                                    : "var(--text-muted)",
                                              fontSize: "0.95rem",
                                              fontStyle: match.teamB
                                                ? "normal"
                                                : "italic",
                                            }}
                                          >
                                            {match.winner?._id ===
                                              match.teamB?._id && "🏆 "}
                                            {match.teamB?.teamName ||
                                              "TBD — waiting for result"}
                                          </div>
                                          {isDone &&
                                            match.teamBScore &&
                                            match.teamBScore.runs > 0 && (
                                              <div
                                                style={{
                                                  fontFamily: "JetBrains Mono",
                                                  fontSize: "0.82rem",
                                                  color: "var(--accent-blue)",
                                                  marginTop: 2,
                                                }}
                                              >
                                                {match.teamBScore.runs}/
                                                {match.teamBScore.wickets} (
                                                {match.teamBScore.overs} ov)
                                              </div>
                                            )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Winner line */}
                                    {match.winner && (
                                      <div
                                        style={{
                                          marginTop: 8,
                                          fontSize: "0.78rem",
                                          color: "var(--accent-green)",
                                          display: "flex",
                                          gap: 16,
                                        }}
                                      >
                                        <span>
                                          🏆 Winner → next match:{" "}
                                          <strong>
                                            {match.winner.teamName}
                                          </strong>
                                        </span>
                                        {match.loser && (
                                          <span
                                            style={{
                                              color: "var(--accent-red)",
                                            }}
                                          >
                                            ⬇️ Loser → LB:{" "}
                                            <strong>
                                              {match.loser.teamName}
                                            </strong>
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Action button */}
                                  <div>
                                    {!match.isBye && hasBothTeams && (
                                      <button
                                        className={`btn btn-sm ${isDone ? "btn-secondary" : "btn-primary"}`}
                                        onClick={() => openScoreModal(match)}
                                      >
                                        {isDone ? "✏️ Edit" : "📊 Score"}
                                      </button>
                                    )}
                                    {!match.isBye && !hasBothTeams && (
                                      <span
                                        style={{
                                          fontSize: "0.75rem",
                                          color: "var(--text-muted)",
                                          padding: "6px 10px",
                                          background: "var(--bg-secondary)",
                                          borderRadius: 6,
                                        }}
                                      >
                                        ⏳ Awaiting teams
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Create Tournament Modal */}
      {showTModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowTModal(false)}
        >
          <div className="modal" style={{ maxWidth: 680 }}>
            <button
              className="modal-close"
              onClick={() => setShowTModal(false)}
            >
              ✕
            </button>
            <h2 className="modal-title">🏟️ Create Tournament</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleCreateTournament}>
              <div className="form-group">
                <label className="form-label">Tournament Name *</label>
                <input
                  className="form-input"
                  value={tForm.name}
                  onChange={(e) => setTForm({ ...tForm, name: e.target.value })}
                  placeholder="e.g., IPL 2024 Summer Cup"
                  required
                />
              </div>
              {/* <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Sport *</label>
                  <select
                    className="form-select"
                    value={tForm.sport}
                    onChange={(e) =>
                      setTForm({ ...tForm, sport: e.target.value })
                    }
                  >
                    {sports.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Venue *</label>
                  <input
                    className="form-input"
                    value={tForm.venue}
                    onChange={(e) =>
                      setTForm({ ...tForm, venue: e.target.value })
                    }
                    placeholder="e.g., Wankhede Stadium"
                    required
                  />
                </div>
              </div> */}

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Sport *</label>
                  <select
                    className="form-select"
                    value={tForm.sport}
                    onChange={(e) =>
                      setTForm({ ...tForm, sport: e.target.value })
                    }
                  >
                    {sports.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Format *</label>
                  <select
                    className="form-select"
                    value={tForm.format}
                    onChange={(e) =>
                      setTForm({ ...tForm, format: e.target.value })
                    }
                  >
                    <option value="single_knockout">Single Knockout</option>
                    <option value="double_knockout">Double Knockout</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Venue *</label>
                <input
                  className="form-input"
                  value={tForm.venue}
                  onChange={(e) =>
                    setTForm({ ...tForm, venue: e.target.value })
                  }
                  placeholder="e.g., Wankhede Stadium"
                  required
                />
              </div>


              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Max Teams *</label>
                  <input
                    className="form-input"
                    type="number"
                    min="2"
                    value={tForm.maxTeams}
                    onChange={(e) =>
                      setTForm({ ...tForm, maxTeams: parseInt(e.target.value) })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Players per Team *</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    value={tForm.playersPerTeam}
                    onChange={(e) =>
                      setTForm({
                        ...tForm,
                        playersPerTeam: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>
              {tForm.sport === "cricket" && (
                <div className="form-group">
                  <label className="form-label">Overs per Innings</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    value={tForm.overs}
                    onChange={(e) =>
                      setTForm({ ...tForm, overs: parseInt(e.target.value) })
                    }
                  />
                </div>
              )}
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input
                    className="form-input"
                    type="date"
                    value={tForm.startDate}
                    onChange={(e) =>
                      setTForm({ ...tForm, startDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={tForm.endDate}
                    onChange={(e) =>
                      setTForm({ ...tForm, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Registration Deadline</label>
                  <input
                    className="form-input"
                    type="date"
                    value={tForm.registrationDeadline}
                    onChange={(e) =>
                      setTForm({
                        ...tForm,
                        registrationDeadline: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Prize Info</label>
                  <input
                    className="form-input"
                    value={tForm.prizeInfo}
                    onChange={(e) =>
                      setTForm({ ...tForm, prizeInfo: e.target.value })
                    }
                    placeholder="e.g., Trophy + ₹50,000"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  value={tForm.description}
                  onChange={(e) =>
                    setTForm({ ...tForm, description: e.target.value })
                  }
                  placeholder="Tournament details, rules, etc."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Initial Status</label>
                <select
                  className="form-select"
                  value={tForm.status}
                  onChange={(e) =>
                    setTForm({ ...tForm, status: e.target.value })
                  }
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="registration_open">Registration Open</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowTModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  🏟️ Create Tournament
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Score Update Modal */}
      {showScoreModal && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setShowScoreModal(null)
          }
        >
          <div className="modal" style={{ maxWidth: 640 }}>
            <button
              className="modal-close"
              onClick={() => {
                setShowScoreModal(null);
                setError("");
              }}
            >
              ✕
            </button>
            <h2 className="modal-title">📊 Update Score</h2>

            {/* Match header */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 16,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span
                className={`badge ${showScoreModal.bracketType === "winners" ? "badge-gold" : showScoreModal.bracketType === "losers" ? "badge-blue" : "badge-purple"}`}
              >
                {showScoreModal.roundName}
              </span>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Match #{showScoreModal.matchNumber}
              </span>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 12 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleUpdateScore}>
              {/* Winner quick-pick — most important step */}
              <div style={{ marginBottom: 20 }}>
                <label className="form-label">Who Won? *</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  {[
                    { team: showScoreModal.teamA, scoreKey: "teamAScore" },
                    { team: showScoreModal.teamB, scoreKey: "teamBScore" },
                  ].map(({ team }) => {
                    const isSelected = scoreForm.winnerId === team?._id;
                    return (
                      <button
                        key={team?._id}
                        type="button"
                        onClick={() =>
                          setScoreForm((f) => ({
                            ...f,
                            winnerId: team?._id,
                            status: "completed",
                          }))
                        }
                        style={{
                          padding: "14px 16px",
                          background: isSelected
                            ? "rgba(245,158,11,0.15)"
                            : "var(--bg-secondary)",
                          border: `2px solid ${isSelected ? "var(--accent-gold)" : "var(--border)"}`,
                          borderRadius: 10,
                          color: isSelected
                            ? "var(--accent-gold)"
                            : "var(--text-primary)",
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: "0.95rem",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          fontFamily: "Inter",
                          textAlign: "center",
                        }}
                      >
                        {isSelected ? "🏆 " : ""}
                        {team?.teamName || "TBD"}
                      </button>
                    );
                  })}
                </div>
                {scoreForm.winnerId && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: "0.8rem",
                      color: "var(--accent-green)",
                    }}
                  >
                    ✅{" "}
                    <strong>
                      {showScoreModal.teamA?._id === scoreForm.winnerId
                        ? showScoreModal.teamA?.teamName
                        : showScoreModal.teamB?.teamName}
                    </strong>{" "}
                    wins
                    {showScoreModal.bracketType === "winners" && (
                      <span style={{ color: "var(--text-muted)" }}>
                        {" "}
                        — loser drops to Losers Bracket
                      </span>
                    )}
                    {showScoreModal.bracketType === "losers" && (
                      <span style={{ color: "var(--accent-red)" }}>
                        {" "}
                        — loser is eliminated
                      </span>
                    )}
                    {showScoreModal.bracketType === "grand_final" && (
                      <span style={{ color: "var(--accent-gold)" }}>
                        {" "}
                        — 🎉 Tournament Champion!
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="divider" />

              {/* Scores side by side */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                {/* Team A score */}
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: 10,
                      color: "var(--accent-gold)",
                      fontSize: "0.9rem",
                    }}
                  >
                    🏏 {showScoreModal.teamA?.teamName}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Runs / Score</label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      value={scoreForm.teamAScore.runs}
                      onChange={(e) =>
                        setScoreForm((f) => ({
                          ...f,
                          teamAScore: {
                            ...f.teamAScore,
                            runs: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Wickets</label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        max="10"
                        value={scoreForm.teamAScore.wickets}
                        onChange={(e) =>
                          setScoreForm((f) => ({
                            ...f,
                            teamAScore: {
                              ...f.teamAScore,
                              wickets: parseInt(e.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Overs</label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        step="0.1"
                        value={scoreForm.teamAScore.overs}
                        onChange={(e) =>
                          setScoreForm((f) => ({
                            ...f,
                            teamAScore: {
                              ...f.teamAScore,
                              overs: parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Extras</label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      value={scoreForm.teamAScore.extras}
                      onChange={(e) =>
                        setScoreForm((f) => ({
                          ...f,
                          teamAScore: {
                            ...f.teamAScore,
                            extras: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Team B score */}
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: 10,
                      color: "var(--accent-blue)",
                      fontSize: "0.9rem",
                    }}
                  >
                    🏏 {showScoreModal.teamB?.teamName}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Runs / Score</label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      value={scoreForm.teamBScore.runs}
                      onChange={(e) =>
                        setScoreForm((f) => ({
                          ...f,
                          teamBScore: {
                            ...f.teamBScore,
                            runs: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Wickets</label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        max="10"
                        value={scoreForm.teamBScore.wickets}
                        onChange={(e) =>
                          setScoreForm((f) => ({
                            ...f,
                            teamBScore: {
                              ...f.teamBScore,
                              wickets: parseInt(e.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Overs</label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        step="0.1"
                        value={scoreForm.teamBScore.overs}
                        onChange={(e) =>
                          setScoreForm((f) => ({
                            ...f,
                            teamBScore: {
                              ...f.teamBScore,
                              overs: parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Extras</label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      value={scoreForm.teamBScore.extras}
                      onChange={(e) =>
                        setScoreForm((f) => ({
                          ...f,
                          teamBScore: {
                            ...f.teamBScore,
                            extras: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <input
                  className="form-input"
                  value={scoreForm.notes}
                  onChange={(e) =>
                    setScoreForm({ ...scoreForm, notes: e.target.value })
                  }
                  placeholder="e.g., DLS applied, Super Over, Walkover"
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setShowScoreModal(null);
                    setError("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  disabled={!scoreForm.winnerId}
                >
                  {scoreForm.winnerId
                    ? "✅ Save & Auto-Advance Teams"
                    : "Select a winner first"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
