import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { tournamentAPI } from "../utils/api";

const sportEmoji = {
  cricket: "🏏",
  football: "⚽",
  basketball: "🏀",
  badminton: "🏸",
  tennis: "🎾",
  volleyball: "🏐",
  other: "🏅",
};

const statusBadge = (status) => {
  const map = {
    registration_open: ["badge-green", "Registration Open"],
    registration_closed: ["badge-gray", "Closed"],
    fixture_generated: ["badge-blue", "Fixture Ready"],
    ongoing: ["badge-live", "● Live"],
    completed: ["badge-navy", "Completed"],
    upcoming: ["badge-orange", "Upcoming"],
  };
  const [cls, label] = map[status] || ["badge-gray", status];
  return <span className={`badge ${cls}`}>{label}</span>;
};

const Tournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    tournamentAPI
      .getAll()
      .then((r) => {
        setTournaments(r.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sports = [
    "all",
    ...new Set(tournaments.map((t) => t.sport).filter(Boolean)),
  ];
  const statuses = [
    "all",
    "registration_open",
    "ongoing",
    "fixture_generated",
    "upcoming",
    "completed",
  ];

  const filtered = tournaments.filter((t) => {
    const matchSport = sportFilter === "all" || t.sport === sportFilter;
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchSearch =
      !search ||
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.venue?.toLowerCase().includes(search.toLowerCase());
    return matchSport && matchStatus && matchSearch;
  });

  return (
    <div className="page-container page-wrapper">
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "var(--royal)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 24,
              height: 2,
              background: "var(--royal)",
              display: "inline-block",
            }}
          ></span>
          All Events
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: "var(--navy)",
              }}
            >
              Tournaments
            </h1>
            <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>
              Browse all PU Sports tournaments — no login required
            </p>
          </div>
          <div
            style={{
              background: "var(--blue-light)",
              border: "1px solid #C0D4F0",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: "0.8rem",
              color: "var(--royal)",
              fontWeight: 500,
            }}
          >
            🌐 Public Access — View fixtures, scores & standings freely
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "20px 24px",
          marginBottom: 28,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div style={{ flex: "1 1 200px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Search
            </label>
            <input
              className="form-input"
              placeholder="Search by name or venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ margin: 0 }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Sport
            </label>
            <select
              className="form-select"
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              style={{ minWidth: 140 }}
            >
              {sports.map((s) => (
                <option key={s} value={s}>
                  {s === "all"
                    ? "All Sports"
                    : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Status
            </label>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: 160 }}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s === "all"
                    ? "All Statuses"
                    : s
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          {(sportFilter !== "all" || statusFilter !== "all" || search) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSportFilter("all");
                setStatusFilter("all");
                setSearch("");
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div
        style={{
          marginBottom: 20,
          fontSize: "0.82rem",
          color: "var(--text-muted)",
          fontWeight: 500,
        }}
      >
        Showing {filtered.length} of {tournaments.length} tournaments
      </div>

      {loading ? (
        <div className="spinner" />
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>🏟️</div>
          <div
            style={{
              fontSize: "1.1rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: 6,
            }}
          >
            No tournaments found
          </div>
          <div style={{ fontSize: "0.875rem" }}>Try adjusting your filters</div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))",
            gap: 20,
          }}
        >
          {filtered.map((t) => (
            <Link
              to={`/tournaments/${t._id}`}
              key={t._id}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  overflow: "hidden",
                  boxShadow: "var(--shadow-sm)",
                  transition: "all 0.25s",
                  display: "flex",
                  flexDirection: "column",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.borderColor = "var(--royal)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                <div
                  style={{
                    background:
                      "linear-gradient(135deg,var(--navy-dark),var(--navy))",
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ fontSize: "2.4rem" }}>
                    {sportEmoji[t.sport] || "🏅"}
                  </div>
                  {statusBadge(t.status)}
                </div>
                <div
                  style={{
                    padding: "16px 20px",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 700,
                      color: "var(--navy)",
                    }}
                  >
                    {t.name}
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 5 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      📍 {t.venue}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      👥 {t.maxTeams} teams · {t.playersPerTeam} players/team
                    </div>
                    {t.startDate && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "0.8rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        📅{" "}
                        {new Date(t.startDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    )}
                    {t.sport === "cricket" && t.overs && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "0.8rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        🏏 {t.overs} overs
                      </div>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    padding: "12px 20px",
                    borderTop: "1px solid var(--border)",
                    background: "var(--bg-primary)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}
                  >
                    {t.format === "single_knockout"
                      ? "➡️ Single Knockout"
                      : "🔄 Double Knockout"}
                  </span>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--royal)",
                      fontWeight: 700,
                    }}
                  >
                    View Details →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tournaments;
