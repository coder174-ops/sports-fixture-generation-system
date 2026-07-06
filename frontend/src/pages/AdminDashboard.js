import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { tournamentAPI, teamAPI, matchAPI } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { FORMAT_GROUPS, formatLabel } from "../utils/formats";

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
    format: "single_knockout",
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
    numGroups: "",
  });

  const [scoreForm, setScoreForm] = useState({
    teamAScore: { runs: 0, wickets: 0, overs: 0, extras: 0 },
    teamBScore: { runs: 0, wickets: 0, overs: 0, extras: 0 },
    winnerId: "",
    status: "completed",
    notes: "",
  });

  const fetchAll = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    fetchAll();
  }, [isAdmin, fetchAll, navigate]);

  const showMsg = (m) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 3000);
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
    try {
      await tournamentAPI.create(tForm);
      showMsg("✅ Tournament created successfully!");
      setShowTModal(false);
      await fetchAll();
      setTForm({
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
        numGroups: "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Error creating tournament");
    }
  };

  const handleApproveTeam = async (teamId, status) => {
    try {
      await teamAPI.updateStatus(teamId, { status });
      await fetchAll();
      showMsg(`Team ${status}!`);
    } catch {
      setError("Error updating team status");
    }
  };

  const handleGenerateFixture = async (tId) => {
    if (
      !window.confirm(
        "Generate the fixture for this tournament? Existing matches will be deleted.",
      )
    )
      return;
    try {
      await matchAPI.generate(tId);
      showMsg("⚡ Fixture generated!");
      await fetchMatchesForTournament(tId);
    } catch (err) {
      setError(err.response?.data?.message || "Error generating fixture");
    }
  };

  const handleUpdateTournamentStatus = async (tId, status) => {
    try {
      await tournamentAPI.update(tId, { status });
      await fetchAll();
    } catch {
      setError("Error updating status");
    }
  };

  const handleDeleteTournament = async (tId, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await tournamentAPI.delete(tId);
      showMsg("Tournament deleted");
      await fetchAll();
    } catch {
      setError("Error deleting tournament");
    }
  };

  const openScoreModal = (match) => {
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
    setError("");
    setShowScoreModal(match);
  };

  const handleUpdateScore = async (e) => {
    e.preventDefault();
    setError("");
    if (!scoreForm.winnerId && scoreForm.status === "completed")
      return setError("Please select the winning team");
    try {
      await matchAPI.updateScore(showScoreModal._id, scoreForm);
      showMsg("✅ Score saved & teams advanced!");
      setShowScoreModal(null);
      if (selectedTournament)
        await fetchMatchesForTournament(selectedTournament);
    } catch (err) {
      setError(err.response?.data?.message || "Error saving score");
    }
  };

  const pendingTeams = teams.filter((t) => t.status === "pending");
  const liveMatches = matches.filter(
    (m) => m.status === "live" || m.status === "completed",
  ).length;

  const tabs = [
    { key: "tournaments", label: "Tournaments", count: tournaments.length },
    { key: "teams", label: "All Teams", count: teams.length },
    {
      key: "pending",
      label: "Pending Approval",
      count: pendingTeams.length,
      highlight: pendingTeams.length > 0,
    },
    { key: "matches", label: "Matches", count: matches.length },
  ];

  return (
    <div className="page-container page-wrapper fade-in">
      {/* Admin header bar */}
      <div
        style={{
          background: "linear-gradient(135deg,var(--navy-dark),var(--navy))",
          borderRadius: 14,
          padding: "24px 28px",
          marginBottom: 28,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "rgba(255,255,255,0.5)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 6,
            }}
          >
            ⚙️ Admin Portal
          </div>
          <h1
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "#fff",
              marginBottom: 4,
            }}
          >
            Tournament Dashboard
          </h1>
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.55)" }}>
            Manage tournaments, approve teams, generate fixtures & update scores
          </p>
        </div>
        <button
          className="btn btn-gold btn-lg"
          onClick={() => setShowTModal(true)}
        >
          + Create Tournament
        </button>
      </div>

      {/* Flash messages */}
      {msg && <div className="alert alert-success">{msg}</div>}
      {error && (
        <div className="alert alert-error">
          {error}{" "}
          <button
            onClick={() => setError("")}
            style={{
              float: "right",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {[
          {
            label: "Tournaments",
            value: tournaments.length,
            color: "var(--navy)",
            icon: "🏆",
          },
          {
            label: "Total Teams",
            value: teams.length,
            color: "var(--royal)",
            icon: "👥",
          },
          {
            label: "Pending Approval",
            value: pendingTeams.length,
            color: pendingTeams.length > 0 ? "var(--red)" : "var(--green)",
            icon: "⏳",
          },
          {
            label: "Matches Loaded",
            value: matches.length,
            color: "var(--blue-accent)",
            icon: "📅",
          },
        ].map((s, i) => (
          <div
            key={i}
            className="stat-box"
            style={{ borderTop: `3px solid ${s.color}` }}
          >
            <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>{s.icon}</div>
            <div className="stat-value" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.count > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  background: t.highlight
                    ? "var(--red)"
                    : "var(--bg-secondary)",
                  color: t.highlight ? "#fff" : "var(--text-muted)",
                  borderRadius: 10,
                  padding: "1px 7px",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TOURNAMENTS TAB ── */}
      {tab === "tournaments" && (
        <div className="fade-in">
          {loading ? (
            <div className="spinner" />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tournament</th>
                    <th>Sport</th>
                    <th>Teams</th>
                    <th>Venue</th>
                    <th>Dates</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tournaments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          textAlign: "center",
                          padding: 48,
                          color: "var(--text-muted)",
                        }}
                      >
                        No tournaments yet. Click "Create Tournament" to get
                        started.
                      </td>
                    </tr>
                  ) : (
                    tournaments.map((t) => {
                      const approved = teams.filter(
                        (tm) =>
                          tm.tournament?._id === t._id &&
                          tm.status === "approved",
                      ).length;
                      const pending = teams.filter(
                        (tm) =>
                          tm.tournament?._id === t._id &&
                          tm.status === "pending",
                      ).length;
                      return (
                        <tr key={t._id}>
                          <td>
                            <div
                              style={{ fontWeight: 700, color: "var(--navy)" }}
                            >
                              {t.name}
                            </div>
                            {t.prizeInfo && (
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  color: "var(--gold)",
                                  marginTop: 2,
                                }}
                              >
                                🏆 {t.prizeInfo}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="badge badge-blue">{t.sport}</span>
                            <div
                              style={{
                                fontSize: "0.68rem",
                                color: "var(--text-muted)",
                                marginTop: 4,
                              }}
                            >
                              {formatLabel(t.format)}
                            </div>
                          </td>
                          <td>
                            <div
                              style={{ fontWeight: 600, color: "var(--navy)" }}
                            >
                              {approved}/{t.maxTeams} approved
                            </div>
                            {pending > 0 && (
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  color: "var(--gold)",
                                  marginTop: 2,
                                }}
                              >
                                ⏳ {pending} pending
                              </div>
                            )}
                          </td>
                          <td
                            style={{
                              fontSize: "0.82rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {t.venue}
                          </td>
                          <td
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            {t.startDate && (
                              <div>
                                📅{" "}
                                {new Date(t.startDate).toLocaleDateString(
                                  "en-IN",
                                )}
                              </div>
                            )}
                            {t.endDate && (
                              <div>
                                🏁{" "}
                                {new Date(t.endDate).toLocaleDateString(
                                  "en-IN",
                                )}
                              </div>
                            )}
                          </td>
                          <td>
                            <select
                              className="form-select"
                              style={{
                                fontSize: "0.75rem",
                                padding: "5px 8px",
                                minWidth: 140,
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
                                  {s
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (c) => c.toUpperCase())}
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
                                className="btn btn-royal btn-sm"
                                onClick={() => handleGenerateFixture(t._id)}
                              >
                                ⚡ Fixture
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => fetchMatchesForTournament(t._id)}
                              >
                                📅 Matches
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() =>
                                  handleDeleteTournament(t._id, t.name)
                                }
                              >
                                🗑
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ALL TEAMS TAB ── */}
      {tab === "teams" && (
        <div className="fade-in table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Tournament</th>
                <th>Captain</th>
                <th>Contact</th>
                <th>Players</th>
                <th>Seed Pts</th>
                <th>W/L</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "var(--text-muted)",
                    }}
                  >
                    No teams yet
                  </td>
                </tr>
              ) : (
                teams.map((team) => (
                  <tr key={team._id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--navy)" }}>
                        {team.teamName}
                      </div>
                      {team.seed > 0 && (
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Seed #{team.seed}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {team.tournament?.name}
                    </td>
                    <td
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.85rem",
                      }}
                    >
                      {team.captainName}
                    </td>
                    <td
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {team.captainContact || "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
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
                      <span style={{ color: "var(--green)", fontWeight: 700 }}>
                        {team.wins || 0}W
                      </span>
                      &nbsp;/&nbsp;
                      <span style={{ color: "var(--red)", fontWeight: 700 }}>
                        {team.losses || 0}L
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${team.status === "approved" ? "badge-green" : team.status === "rejected" ? "badge-red" : "badge-gold"}`}
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
                              ✓
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() =>
                                handleApproveTeam(team._id, "rejected")
                              }
                            >
                              ✕
                            </button>
                          </>
                        )}
                        {team.status !== "pending" && (
                          <span
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            —
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PENDING APPROVAL TAB ── */}
      {tab === "pending" && (
        <div className="fade-in">
          {pendingTeams.length === 0 ? (
            <div
              className="card"
              style={{ textAlign: "center", padding: "60px 20px" }}
            >
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>✅</div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--navy)",
                  marginBottom: 8,
                }}
              >
                All caught up!
              </div>
              <p style={{ color: "var(--text-secondary)" }}>
                No pending team registrations to review
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {pendingTeams.map((team) => (
                <div
                  key={team._id}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderLeft: "4px solid var(--gold)",
                    borderRadius: 12,
                    padding: "20px 24px",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 10,
                        }}
                      >
                        <h3
                          style={{
                            fontWeight: 800,
                            fontSize: "1.1rem",
                            color: "var(--navy)",
                          }}
                        >
                          {team.teamName}
                        </h3>
                        <span className="badge badge-gold">⏳ Pending</span>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill,minmax(200px,1fr))",
                          gap: "6px 24px",
                          marginBottom: 12,
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          🏆 <strong>{team.tournament?.name}</strong>
                        </div>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          🏅 {team.tournament?.sport}
                        </div>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          👤 {team.captainName}
                        </div>
                        {team.captainContact && (
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            📞 {team.captainContact}
                          </div>
                        )}
                        {team.captainEmail && (
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            ✉️ {team.captainEmail}
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          👥 {team.players?.length || 0} players ·{" "}
                          {team.points || 0} seeding pts
                        </div>
                      </div>
                      {team.players?.length > 0 && (
                        <div>
                          <div
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              color: "var(--text-muted)",
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              marginBottom: 6,
                            }}
                          >
                            Players
                          </div>
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
                    <div style={{ display: "flex", gap: 10 }}>
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

      {/* ── MATCHES TAB ── */}
      {tab === "matches" && (
        <div className="fade-in">
          {!selectedTournament ? (
            <div
              className="card"
              style={{ textAlign: "center", padding: "60px 20px" }}
            >
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>📅</div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--navy)",
                  marginBottom: 8,
                }}
              >
                Select a Tournament
              </div>
              <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>
                Go to the Tournaments tab and click "Matches" on any tournament
              </p>
              <button
                className="btn btn-royal"
                onClick={() => setTab("tournaments")}
              >
                ← Go to Tournaments
              </button>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <h3
                    style={{
                      fontWeight: 800,
                      fontSize: "1.15rem",
                      color: "var(--navy)",
                    }}
                  >
                    {
                      tournaments.find((t) => t._id === selectedTournament)
                        ?.name
                    }
                  </h3>
                  <p
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    Complete matches in order — winners & losers auto-advance to
                    next round
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-royal"
                    onClick={() => handleGenerateFixture(selectedTournament)}
                  >
                    ⚡ Regenerate
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setTab("tournaments")}
                  >
                    ← Back
                  </button>
                </div>
              </div>

              {matches.length === 0 ? (
                <div
                  className="card"
                  style={{ textAlign: "center", padding: 40 }}
                >
                  <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📅</div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "var(--navy)",
                      marginBottom: 8,
                    }}
                  >
                    No matches yet
                  </div>
                  <p
                    style={{ color: "var(--text-secondary)", marginBottom: 20 }}
                  >
                    Generate the fixture first using the Tournaments tab
                  </p>
                </div>
              ) : (
                <>
                  {/* Progress summary */}
                  <div
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "16px 20px",
                      marginBottom: 20,
                      display: "flex",
                      gap: 20,
                      flexWrap: "wrap",
                    }}
                  >
                    {[
                      {
                        label: "Total",
                        count: matches.filter((m) => !m.isBye).length,
                        color: "var(--navy)",
                      },
                      {
                        label: "Completed",
                        count: matches.filter((m) => m.status === "completed")
                          .length,
                        color: "var(--green)",
                      },
                      {
                        label: "Live",
                        count: matches.filter((m) => m.status === "live")
                          .length,
                        color: "var(--red)",
                      },
                      {
                        label: "Scheduled",
                        count: matches.filter((m) => m.status === "scheduled")
                          .length,
                        color: "var(--text-muted)",
                      },
                    ].map((s, i) => (
                      <div
                        key={i}
                        style={{
                          textAlign: "center",
                          padding: "0 16px",
                          borderRight:
                            i < 3 ? "1px solid var(--border)" : "none",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "1.4rem",
                            fontWeight: 800,
                            color: s.color,
                          }}
                        >
                          {s.count}
                        </div>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  {matches.some(
                    (m) =>
                      m.bracketType === "knockout" ||
                      m.bracketType === "league",
                  ) ? (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 20,
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="badge badge-blue">🥊 Stage 1</span>
                      <span className="badge badge-navy">🏆 Stage 2</span>
                      <span className="badge badge-green">✅ Completed</span>
                      <span className="badge badge-gray">⏳ Waiting</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 20,
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="badge badge-gold">
                        🥇 Winners Bracket
                      </span>
                      <span className="badge badge-blue">
                        🔁 Losers Bracket
                      </span>
                      <span className="badge badge-navy">🏆 Grand Final</span>
                      <span className="badge badge-green">✅ Completed</span>
                      <span className="badge badge-gray">⏳ Waiting</span>
                    </div>
                  )}

                  {/* Match sections */}
                  {(() => {
                    const isCombination = matches.some(
                      (m) =>
                        m.bracketType === "knockout" ||
                        m.bracketType === "league",
                    );
                    let sections;
                    if (!isCombination) {
                      sections = [
                        {
                          label: "🥇 Winners Bracket",
                          type: "winners",
                          color: "var(--gold)",
                          cls: "badge-gold",
                        },
                        {
                          label: "🔁 Losers Bracket",
                          type: "losers",
                          color: "var(--royal)",
                          cls: "badge-blue",
                        },
                        {
                          label: "🏆 Grand Final",
                          type: "grand_final",
                          color: "var(--navy)",
                          cls: "badge-navy",
                        },
                      ].map((s) => ({
                        ...s,
                        section: matches.filter(
                          (m) => m.bracketType === s.type,
                        ),
                      }));
                    } else {
                      const groups = {};
                      const keyOrder = [];
                      matches.forEach((m) => {
                        const key = `${m.stage}|${m.groupName || ""}`;
                        if (!groups[key]) {
                          groups[key] = [];
                          keyOrder.push(key);
                        }
                        groups[key].push(m);
                      });
                      keyOrder.sort(
                        (a, b) =>
                          Number(a.split("|")[0]) - Number(b.split("|")[0]),
                      );
                      sections = keyOrder.map((key) => {
                        const [stage, groupName] = key.split("|");
                        const section = groups[key];
                        const stageLabel =
                          section[0]?.stageLabel ||
                          (stage === "1" ? "Stage 1" : "Stage 2");
                        const label = groupName
                          ? `🥊 ${groupName} — ${stageLabel}`
                          : `${stage === "2" ? "🏆" : "🥊"} ${stageLabel}`;
                        return {
                          label,
                          type: key,
                          color: stage === "2" ? "var(--navy)" : "var(--royal)",
                          cls: stage === "2" ? "badge-navy" : "badge-blue",
                          section,
                        };
                      });
                    }
                    return sections.map(
                      ({ label, type, color, cls, section }) => {
                        if (!section.length) return null;
                        const done = section.filter(
                          (m) => m.status === "completed" || m.status === "bye",
                        ).length;
                        return (
                          <div key={type} style={{ marginBottom: 28 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                marginBottom: 12,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.82rem",
                                  fontWeight: 700,
                                  color,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em",
                                }}
                              >
                                {label}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  color: "var(--text-muted)",
                                  background: "var(--bg-secondary)",
                                  padding: "2px 8px",
                                  borderRadius: 10,
                                  fontWeight: 600,
                                }}
                              >
                                {done}/{section.length} done
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                              }}
                            >
                              {section.map((match) => {
                                const hasBoth = match.teamA && match.teamB;
                                const isReady =
                                  hasBoth &&
                                  match.status !== "completed" &&
                                  match.status !== "bye";
                                const isDone =
                                  match.status === "completed" ||
                                  match.status === "bye";
                                const isLive = match.status === "live";
                                return (
                                  <div
                                    key={match._id}
                                    style={{
                                      background: isLive
                                        ? "var(--red-bg)"
                                        : isReady
                                          ? "var(--blue-light)"
                                          : isDone
                                            ? "var(--bg-primary)"
                                            : "var(--bg-card)",
                                      border: `1px solid ${isLive ? "var(--red)" : isReady ? "var(--blue-accent)" : isDone ? "var(--border)" : "var(--border)"}`,
                                      borderLeft: `4px solid ${isLive ? "var(--red)" : isReady ? color : isDone ? "var(--border)" : "var(--border-light)"}`,
                                      borderRadius: 10,
                                      padding: "16px 20px",
                                      transition: "all 0.2s",
                                      opacity: isDone && !isLive ? 0.8 : 1,
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
                                        {/* Match header */}
                                        <div
                                          style={{
                                            display: "flex",
                                            gap: 8,
                                            marginBottom: 12,
                                            flexWrap: "wrap",
                                            alignItems: "center",
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontFamily: "monospace",
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
                                            style={{ fontSize: "0.65rem" }}
                                          >
                                            {match.roundName}
                                          </span>
                                          <span
                                            className={`badge ${isDone ? "badge-green" : isLive ? "badge-live" : isReady ? "badge-blue" : "badge-gray"}`}
                                            style={{ fontSize: "0.65rem" }}
                                          >
                                            {match.isBye
                                              ? "BYE"
                                              : isDone
                                                ? "✓ DONE"
                                                : isLive
                                                  ? "● LIVE"
                                                  : isReady
                                                    ? "▶ READY"
                                                    : "⏳ WAITING"}
                                          </span>
                                        </div>

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
                                                color: "var(--navy)",
                                                fontSize: "0.95rem",
                                              }}
                                            >
                                              {match.teamA?.teamName || "TBD"}
                                            </span>
                                            <span
                                              className="badge badge-blue"
                                              style={{ fontSize: "0.65rem" }}
                                            >
                                              Auto Advances (BYE)
                                            </span>
                                          </div>
                                        ) : (
                                          <div
                                            style={{
                                              display: "grid",
                                              gridTemplateColumns:
                                                "1fr auto 1fr",
                                              alignItems: "center",
                                              gap: 12,
                                            }}
                                          >
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
                                                        ? "var(--navy)"
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
                                                  "TBD — waiting"}
                                              </div>
                                              {match.teamAScore?.runs > 0 && (
                                                <div
                                                  style={{
                                                    fontFamily: "monospace",
                                                    fontSize: "0.78rem",
                                                    color:
                                                      "var(--text-secondary)",
                                                    marginTop: 3,
                                                  }}
                                                >
                                                  {match.teamAScore.runs}/
                                                  {match.teamAScore.wickets} (
                                                  {match.teamAScore.overs}ov)
                                                </div>
                                              )}
                                            </div>
                                            <div
                                              style={{
                                                textAlign: "center",
                                                color: "var(--text-muted)",
                                                fontWeight: 700,
                                                fontSize: "0.75rem",
                                                padding: "5px 12px",
                                                background:
                                                  "var(--bg-secondary)",
                                                borderRadius: 6,
                                              }}
                                            >
                                              VS
                                            </div>
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
                                                        ? "var(--navy)"
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
                                                  "TBD — waiting"}
                                              </div>
                                              {match.teamBScore?.runs > 0 && (
                                                <div
                                                  style={{
                                                    fontFamily: "monospace",
                                                    fontSize: "0.78rem",
                                                    color:
                                                      "var(--text-secondary)",
                                                    marginTop: 3,
                                                  }}
                                                >
                                                  {match.teamBScore.runs}/
                                                  {match.teamBScore.wickets} (
                                                  {match.teamBScore.overs}ov)
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {match.winner && (
                                          <div
                                            style={{
                                              marginTop: 10,
                                              fontSize: "0.78rem",
                                              display: "flex",
                                              gap: 16,
                                              flexWrap: "wrap",
                                            }}
                                          >
                                            <span
                                              style={{ color: "var(--green)" }}
                                            >
                                              🏆 Winner:{" "}
                                              <strong>
                                                {match.winner.teamName}
                                              </strong>{" "}
                                              → advances
                                            </span>
                                            {match.loser && (
                                              <span
                                                style={{ color: "var(--red)" }}
                                              >
                                                ⬇️ {match.loser.teamName} →{" "}
                                                {match.bracketType === "winners"
                                                  ? "Losers Bracket"
                                                  : "eliminated"}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {/* Action */}
                                      {!match.isBye && hasBoth && (
                                        <button
                                          className={`btn btn-sm ${isDone ? "btn-secondary" : "btn-royal"}`}
                                          onClick={() => openScoreModal(match)}
                                        >
                                          {isDone
                                            ? "✏️ Edit Score"
                                            : "📊 Enter Score"}
                                        </button>
                                      )}
                                      {!match.isBye && !hasBoth && (
                                        <span
                                          style={{
                                            fontSize: "0.75rem",
                                            color: "var(--text-muted)",
                                            padding: "6px 12px",
                                            background: "var(--bg-secondary)",
                                            borderRadius: 8,
                                          }}
                                        >
                                          ⏳ Awaiting teams
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      },
                    );
                  })()}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── CREATE TOURNAMENT MODAL ── */}
      {showTModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowTModal(false)}
        >
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2 className="modal-title">🏟️ Create New Tournament</h2>
              <button
                className="modal-close"
                onClick={() => setShowTModal(false)}
              >
                ✕
              </button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleCreateTournament}>
              <div className="form-group">
                <label className="form-label">Tournament Name *</label>
                <input
                  className="form-input"
                  value={tForm.name}
                  onChange={(e) => setTForm({ ...tForm, name: e.target.value })}
                  placeholder="e.g., PU Summer Cricket Cup 2026"
                  required
                />
              </div>
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
                  <label className="form-label">Venue *</label>
                  <input
                    className="form-input"
                    value={tForm.venue}
                    onChange={(e) =>
                      setTForm({ ...tForm, venue: e.target.value })
                    }
                    placeholder="e.g., PU Sports Complex"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tournament Format *</label>
                <select
                  className="form-select"
                  value={tForm.format}
                  onChange={(e) =>
                    setTForm({
                      ...tForm,
                      format: e.target.value,
                      numGroups: "",
                    })
                  }
                >
                  {FORMAT_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginTop: 6,
                  }}
                >
                  Combination formats work for any number of teams — Stage 1
                  results decide who advances to Stage 2.
                </p>
              </div>
              {(tForm.format === "league_cum_knockout" ||
                tForm.format === "knockout_cum_knockout") && (
                <div className="form-group">
                  <label className="form-label">
                    Number of Groups{" "}
                    <span
                      style={{
                        color: "var(--text-muted)",
                        textTransform: "none",
                        fontWeight: 400,
                      }}
                    >
                      (optional — leave blank for auto)
                    </span>
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min="2"
                    max="16"
                    value={tForm.numGroups}
                    onChange={(e) =>
                      setTForm({ ...tForm, numGroups: e.target.value })
                    }
                    placeholder="e.g. 4  (auto: ~3 teams per group)"
                  />
                  <p
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      marginTop: 4,
                    }}
                  >
                    Default auto rule: 12 teams → 4 groups of 3, 8 teams → 3
                    groups, etc.
                  </p>
                </div>
              )}
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Max Teams *</label>
                  <input
                    className="form-input"
                    type="number"
                    min="2"
                    max="64"
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
                    max="30"
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
                    placeholder="e.g., Trophy + ₹25,000"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description / Rules</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={tForm.description}
                  onChange={(e) =>
                    setTForm({ ...tForm, description: e.target.value })
                  }
                  placeholder="Tournament rules, eligibility, format details..."
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
                  <option value="upcoming">Upcoming (not open yet)</option>
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

      {/* ── SCORE MODAL ── */}
      {showScoreModal && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setShowScoreModal(null)
          }
        >
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">📊 Update Match Score</h2>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <span
                    className={`badge ${showScoreModal.bracketType === "winners" ? "badge-gold" : showScoreModal.bracketType === "losers" ? "badge-blue" : "badge-navy"}`}
                    style={{ fontSize: "0.65rem" }}
                  >
                    {showScoreModal.roundName}
                  </span>
                  <span
                    style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}
                  >
                    Match #{showScoreModal.matchNumber}
                  </span>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => {
                  setShowScoreModal(null);
                  setError("");
                }}
              >
                ✕
              </button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleUpdateScore}>
              {/* Match status */}
              <div className="form-group">
                <label className="form-label">Match Status</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["live", "completed"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`btn btn-sm ${scoreForm.status === s ? (s === "live" ? "btn-danger" : "btn-success") : "btn-secondary"}`}
                      onClick={() => setScoreForm((f) => ({ ...f, status: s }))}
                    >
                      {s === "live" ? "● Set Live" : "✓ Mark Completed"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Winner picker */}
              <div className="form-group">
                <label className="form-label">Select Winner *</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  {[showScoreModal.teamA, showScoreModal.teamB].map((team) => {
                    const sel = scoreForm.winnerId === team?._id;
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
                          background: sel
                            ? "var(--blue-light)"
                            : "var(--bg-secondary)",
                          border: `2px solid ${sel ? "var(--royal)" : "var(--border)"}`,
                          borderRadius: 10,
                          color: sel ? "var(--navy)" : "var(--text-primary)",
                          fontWeight: sel ? 800 : 500,
                          fontSize: "0.95rem",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          fontFamily: "Inter",
                          textAlign: "center",
                        }}
                      >
                        {sel ? "🏆 " : ""}
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
                      color: "var(--green)",
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
                      <span style={{ color: "var(--red)" }}>
                        {" "}
                        — loser is eliminated
                      </span>
                    )}
                    {showScoreModal.bracketType === "grand_final" && (
                      <span style={{ color: "var(--gold)" }}>
                        {" "}
                        — 🎉 Champion!
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="divider" />

              {/* Scores side by side */}
              <div className="grid-2" style={{ marginBottom: 16 }}>
                {[
                  {
                    team: showScoreModal.teamA,
                    key: "teamAScore",
                    color: "var(--gold)",
                  },
                  {
                    team: showScoreModal.teamB,
                    key: "teamBScore",
                    color: "var(--royal)",
                  },
                ].map(({ team, key, color }) => (
                  <div
                    key={key}
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        marginBottom: 12,
                        color,
                        fontSize: "0.88rem",
                      }}
                    >
                      🏏 {team?.teamName}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Runs / Score</label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        value={scoreForm[key].runs}
                        onChange={(e) =>
                          setScoreForm((f) => ({
                            ...f,
                            [key]: {
                              ...f[key],
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
                          value={scoreForm[key].wickets}
                          onChange={(e) =>
                            setScoreForm((f) => ({
                              ...f,
                              [key]: {
                                ...f[key],
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
                          value={scoreForm[key].overs}
                          onChange={(e) =>
                            setScoreForm((f) => ({
                              ...f,
                              [key]: {
                                ...f[key],
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
                        value={scoreForm[key].extras}
                        onChange={(e) =>
                          setScoreForm((f) => ({
                            ...f,
                            [key]: {
                              ...f[key],
                              extras: parseInt(e.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <input
                  className="form-input"
                  value={scoreForm.notes}
                  onChange={(e) =>
                    setScoreForm({ ...scoreForm, notes: e.target.value })
                  }
                  placeholder="DLS applied, Super Over, Walkover, etc."
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
                  disabled={
                    !scoreForm.winnerId && scoreForm.status === "completed"
                  }
                >
                  {scoreForm.winnerId
                    ? "✅ Save & Auto-Advance"
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
