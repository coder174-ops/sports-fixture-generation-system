import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tournamentAPI } from '../utils/api';
import './Home.css';

const sportEmoji = { cricket:'🏏', football:'⚽', basketball:'🏀', badminton:'🏸', tennis:'🎾', volleyball:'🏐', other:'🏅' };

const statusBadge = (status) => {
  const map = {
    registration_open: ['badge-green','Registration Open'],
    registration_closed: ['badge-gray','Closed'],
    fixture_generated: ['badge-blue','Fixture Ready'],
    ongoing: ['badge-live','● Live'],
    completed: ['badge-gray','Completed'],
    upcoming: ['badge-orange','Upcoming'],
  };
  const [cls, label] = map[status] || ['badge-gray', status];
  return <span className={`badge ${cls}`}>{label}</span>;
};

const Home = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    tournamentAPI.getAll().then(r => { setTournaments(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? tournaments : tournaments.filter(t => t.sport === filter);
  const sports = ['all', ...new Set(tournaments.map(t => t.sport).filter(Boolean))];
  const liveCount = tournaments.filter(t => t.status === 'ongoing').length;
  const openCount = tournaments.filter(t => t.status === 'registration_open').length;

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-content page-container">
          <div className="hero-eyebrow">🏛️ Panjab University Sports Department</div>
          <h1 className="hero-title">
            Official <span className="hero-title-accent">Tournament</span><br />
            Management System
          </h1>
          <p className="hero-subtitle">Fixture Generator & Administration Portal</p>
          <p className="hero-desc">
            A centralized platform for managing inter-university sporting tournaments — from team registration and fixture generation to live scoring and standings.
          </p>
          <div className="hero-actions">
            <Link to="/tournaments" className="btn btn-gold btn-xl">Browse Tournaments</Link>
            <Link to="/register" className="btn btn-outline btn-xl" style={{color:'#fff',borderColor:'rgba(255,255,255,0.4)'}}>Register Team</Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">{tournaments.length}</div>
              <div className="hero-stat-label">Tournaments</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">{liveCount}</div>
              <div className="hero-stat-label">Live Now</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">{openCount}</div>
              <div className="hero-stat-label">Open for Reg.</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">DKO</div>
              <div className="hero-stat-label">Format</div>
            </div>
          </div>
        </div>
      </section>

      {/* Info banner */}
      <div className="info-banner">
        <div className="page-container">
          <div className="info-banner-inner">
            <div className="info-item">🌐 <span>Public access — no login required to view fixtures & scores</span></div>
            <div className="info-item">👤 <span>Login to register your team</span></div>
            <div className="info-item">⚙️ <span>Admin portal for tournament management</span></div>
          </div>
        </div>
      </div>

      {/* Who can use this */}
      <section className="section">
        <div className="page-container">
          <div className="section-header">
            <div className="section-label">Access Levels</div>
            <h2 className="section-title">Designed for Everyone</h2>
            <p className="section-subtitle">Three levels of access to suit your role</p>
          </div>
          <div className="user-types">
            <div className="user-type-card public">
              <div className="user-type-icon">🌐</div>
              <div className="user-type-title">Public Visitor</div>
              <p className="user-type-desc">No login needed. View all active tournaments, live scores, match results, fixtures, and standings in real time.</p>
              <Link to="/tournaments" className="btn btn-secondary btn-sm">View Tournaments →</Link>
            </div>
            <div className="user-type-card registered">
              <div className="user-type-icon">👤</div>
              <div className="user-type-title">Registered User</div>
              <p className="user-type-desc">Create an account to register your team in tournaments, track your team's bracket progress, and manage your registrations.</p>
              <Link to="/register" className="btn btn-royal btn-sm">Create Account →</Link>
            </div>
            <div className="user-type-card admin">
              <div className="user-type-icon">⚙️</div>
              <div className="user-type-title">Admin</div>
              <p className="user-type-desc">Full control — create and manage tournaments, approve teams, generate double-knockout fixtures, and update live match scores.</p>
              <Link to="/login" className="btn btn-primary btn-sm">Admin Login →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Active Tournaments */}
      <section className="section section-alt">
        <div className="page-container">
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
            <div>
              <div className="section-label">Live & Upcoming</div>
              <h2 className="section-title">Active Tournaments</h2>
              <p className="section-subtitle">Browse and register — no login needed to view</p>
            </div>
            <Link to="/tournaments" className="btn btn-secondary">View All Tournaments →</Link>
          </div>

          <div className="sport-filters">
            {sports.map(s => (
              <button key={s} className={`sport-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                {s !== 'all' && sportEmoji[s]} {s === 'all' ? 'All Sports' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {loading ? <div className="spinner" /> : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏟️</div>
              <div className="empty-title">No tournaments yet</div>
              <div className="empty-desc">Check back soon or contact the sports department</div>
            </div>
          ) : (
            <div className="tournament-grid">
              {filtered.slice(0, 6).map(t => (
                <Link to={`/tournaments/${t._id}`} key={t._id} className="t-card">
                  <div className="t-card-top">
                    <div className="t-card-sport">{sportEmoji[t.sport] || '🏅'}</div>
                    {statusBadge(t.status)}
                  </div>
                  <div className="t-card-body">
                    <div className="t-card-name">{t.name}</div>
                    <div className="t-card-meta">
                      <div className="t-meta-row">📍 <span>{t.venue}</span></div>
                      <div className="t-meta-row">👥 <span>{t.maxTeams} Teams max · {t.playersPerTeam} players/team</span></div>
                      {t.startDate && <div className="t-meta-row">📅 <span>{new Date(t.startDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span></div>}
                      {t.sport === 'cricket' && t.overs && <div className="t-meta-row">🏏 <span>{t.overs} Overs</span></div>}
                    </div>
                  </div>
                  <div className="t-card-footer">
                    <span className="t-format-tag">🔄 Double Knockout</span>
                    <span className="t-view">View Details →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="section">
        <div className="page-container">
          <div className="section-header" style={{textAlign:'center'}}>
            <div className="section-label" style={{justifyContent:'center'}}>Process</div>
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">From registration to championship in 4 steps</p>
          </div>
          <div className="steps-grid">
            {[
              {n:'01', icon:'📋', title:'Admin Creates Tournament', desc:'Sets sport, max teams, players, venue, dates, and opens registration.'},
              {n:'02', icon:'✍️', title:'Teams Register', desc:'Users register their team with captain & player details. Admin reviews and approves.'},
              {n:'03', icon:'⚡', title:'Fixture Generated', desc:'Admin generates double-knockout bracket with automatic seeding and bye assignment.'},
              {n:'04', icon:'🏆', title:'Live Matches & Results', desc:'Admin updates scores live. Standings and points table update automatically.'},
            ].map((s, i) => (
              <div key={i} className="step-card">
                <div className="step-number">{s.n}</div>
                <div className="step-icon">{s.icon}</div>
                <div className="step-title">{s.title}</div>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DKO Explanation */}
      <section className="section section-alt">
        <div className="page-container">
          <div className="dko-grid">
            <div>
              <div className="section-label">Tournament Format</div>
              <h2 className="section-title">Double Knockout</h2>
              <p className="section-subtitle" style={{marginBottom:16}}>Every team gets a second chance</p>
              <p style={{color:'var(--text-secondary)',lineHeight:1.8,fontSize:'0.9rem'}}>
                In Double Knockout, a team is eliminated only after losing <strong style={{color:'var(--navy)'}}>twice</strong>. After the first loss in the Winners Bracket, teams drop to the Losers Bracket — still in contention.
              </p>
              <ul className="dko-features">
                <li className="dko-feature"><span className="dko-feature-icon">🥇</span><span><strong>Seeding</strong> based on past performance & points</span></li>
                <li className="dko-feature"><span className="dko-feature-icon">🎰</span><span><strong>Byes</strong> automatically assigned to top seeds</span></li>
                <li className="dko-feature"><span className="dko-feature-icon">⬇️</span><span><strong>Winners Bracket</strong> — undefeated teams</span></li>
                <li className="dko-feature"><span className="dko-feature-icon">🔁</span><span><strong>Losers Bracket</strong> — one loss, still fighting</span></li>
                <li className="dko-feature"><span className="dko-feature-icon">🏆</span><span><strong>Grand Final</strong> — WB champion vs LB champion</span></li>
                <li className="dko-feature"><span className="dko-feature-icon">📊</span><span><strong>Points Table</strong> with NRR, wins, losses auto-calculated</span></li>
              </ul>
            </div>
            <div className="dko-diagram">
              <div className="dko-diagram-title">Bracket Structure</div>
              <div className="bracket-vis">
                <div className="bracket-row">
                  <div className="bracket-box wb">🥇 WB Round 1</div>
                  <div className="bracket-arr">→</div>
                  <div className="bracket-box wb">WB Final</div>
                </div>
                <div className="bracket-drop">↓ First Loss drops here</div>
                <div className="bracket-row">
                  <div className="bracket-box lb">🔁 LB Round 1</div>
                  <div className="bracket-arr">→</div>
                  <div className="bracket-box lb">LB Final</div>
                </div>
                <div style={{display:'flex',justifyContent:'center',marginTop:8}}>
                  <div className="bracket-arr" style={{fontSize:'1.2rem'}}>↓</div>
                </div>
                <div className="bracket-box gf">🏆 Grand Final</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="page-container">
          <div className="footer-grid">
            <div>
              <div className="footer-brand-name">🏆 PU Tournament Management System</div>
              <p className="footer-brand-desc">Official platform of the Panjab University Sports Department for managing inter-university sporting tournaments with automated fixture generation and live scoring.</p>
            </div>
            <div>
              <div className="footer-col-title">Quick Links</div>
              <div className="footer-links">
                <Link to="/tournaments">Tournaments</Link>
                <Link to="/register">Register Team</Link>
                <Link to="/login">Login</Link>
                <Link to="/my-teams">My Teams</Link>
              </div>
            </div>
            <div>
              <div className="footer-col-title">Portal Access</div>
              <div className="footer-links">
                <Link to="/tournaments">Public View</Link>
                <Link to="/register">Team Registration</Link>
                <Link to="/admin">Admin Dashboard</Link>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Panjab University Sports Department. All rights reserved.</span>
            <span>Built with MERN Stack</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
