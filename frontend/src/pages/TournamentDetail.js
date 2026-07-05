import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tournamentAPI, teamAPI, matchAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const sportEmoji = { cricket: '🏏', football: '⚽', basketball: '🏀', badminton: '🏸', tennis: '🎾', volleyball: '🏐', other: '🏅' };

const bracketColors = { winners: '#f59e0b', losers: '#3b82f6', grand_final: '#8b5cf6' };

const TournamentDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [showRegModal, setShowRegModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [regForm, setRegForm] = useState({
    teamName: '', captainName: '', captainContact: '', captainEmail: '',
    players: [], points: 0
  });
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [t, tm, m] = await Promise.all([
        tournamentAPI.getOne(id),
        teamAPI.getByTournament(id),
        matchAPI.getByTournament(id),
      ]);
      setTournament(t.data);
      setTeams(tm.data);
      setMatches(m.data);
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError(''); setRegSuccess('');
    if (!regForm.teamName || !regForm.captainName) return setRegError('Team name and captain name are required');
    setRegLoading(true);
    try {
      await teamAPI.register({ tournamentId: id, ...regForm });
      setRegSuccess('Team registered! Pending admin approval.');
      setTimeout(() => { setShowRegModal(false); setRegSuccess(''); }, 3000);
      const tm = await teamAPI.getByTournament(id);
      setTeams(tm.data);
    } catch (err) {
      setRegError(err.response?.data?.message || 'Registration failed');
    }
    setRegLoading(false);
  };

  const approvedTeams = teams.filter(t => t.status === 'approved');
  const winnerMatches = matches.filter(m => m.bracketType === 'winners').sort((a, b) => a.matchNumber - b.matchNumber);
  const loserMatches = matches.filter(m => m.bracketType === 'losers').sort((a, b) => a.matchNumber - b.matchNumber);
  const finalMatches = matches.filter(m => m.bracketType === 'grand_final').sort((a, b) => a.matchNumber - b.matchNumber);

  if (loading) return <div className="page-container"><div className="spinner" /></div>;
  if (!tournament) return <div className="page-container"><div className="alert alert-error">Tournament not found</div></div>;

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div style={{ padding: '40px 0 0', marginBottom: 28 }}>
        <Link to="/tournaments" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          ← Back to Tournaments
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ fontSize: '3.5rem' }}>{sportEmoji[tournament.sport] || '🏅'}</div>
            <div>
              <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2.2rem', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>{tournament.name}</h1>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <span className="badge badge-blue">{tournament.sport?.toUpperCase()}</span>
                <span className={`badge ${tournament.format === 'single_knockout' ? 'badge-blue' : 'badge-purple'}`}>
                 {tournament.format === 'single_knockout' ? '➡️ SINGLE KNOCKOUT' : '🔄 DOUBLE KNOCKOUT'}
                 </span>
                <span className={`badge ${tournament.status === 'registration_open' ? 'badge-green' : tournament.status === 'ongoing' ? 'badge-gold' : 'badge-gray'}`}>
                  {tournament.status?.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          {tournament.status === 'registration_open' && user && (
            <button className="btn btn-primary btn-lg" onClick={() => setShowRegModal(true)}>✍️ Register Team</button>
          )}
          {tournament.status === 'registration_open' && !user && (
            <Link to="/login" className="btn btn-primary btn-lg">Login to Register</Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--border)' }}>
        {[
          { key: 'overview', label: '📋 Overview' },
          { key: 'teams', label: `👥 Teams (${approvedTeams.length})` },
          { key: 'fixtures', label: `📅 Schedule (${matches.length})` },
          { key: 'bracket', label: '🏆 Bracket' },
        ].map(tab => (
          <button key={tab.key}
            style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === tab.key ? 'var(--accent-gold)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'Inter', transition: 'color 0.2s', marginBottom: -1 }}
            onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid-2" style={{ gap: 20, marginBottom: 40 }}>
          <div className="card">
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', letterSpacing: '0.06em', marginBottom: 16, color: 'var(--accent-gold)' }}>Tournament Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['📍 Venue', tournament.venue],
                ['👥 Max Teams', tournament.maxTeams],
                ['🎮 Players/Team', tournament.playersPerTeam],
                ...(tournament.sport === 'cricket' && tournament.overs ? [['🏏 Overs', tournament.overs]] : []),
                ['🔄 Format', tournament.format === 'single_knockout' ? 'Single Knockout' : 'Double Knockout'],
                ['📅 Start Date', tournament.startDate ? new Date(tournament.startDate).toLocaleDateString('en-IN', { dateStyle: 'long' }) : 'TBA'],
                ...(tournament.prizeInfo ? [['🏅 Prize', tournament.prizeInfo]] : []),
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', paddingBottom: 8, borderBottom: '1px solid rgba(30,58,95,0.3)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', letterSpacing: '0.06em', marginBottom: 12, color: 'var(--accent-gold)' }}>Registration</h3>
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Teams Approved</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{approvedTeams.length} / {tournament.maxTeams}</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent-gold), #d97706)', borderRadius: 4, width: `${Math.min((approvedTeams.length / tournament.maxTeams) * 100, 100)}%` }} />
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tournament.maxTeams - approvedTeams.length} spots remaining</p>
            </div>
            {tournament.description && (
              <div className="card">
                <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', letterSpacing: '0.06em', marginBottom: 10, color: 'var(--accent-gold)' }}>About</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{tournament.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TEAMS */}
      {activeTab === 'teams' && (
        <div style={{ marginBottom: 40 }}>
          <div className="card">
            {teams.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">👥</div><div className="empty-state-title">No teams registered yet</div></div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Seed</th><th>Team</th><th>Captain</th><th>Players</th><th>Points</th><th>Bracket</th><th>Status</th></tr></thead>
                  <tbody>
                    {[...teams].sort((a, b) => (a.seed || 99) - (b.seed || 99)).map(team => (
                      <tr key={team._id}>
                        <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent-gold)', fontWeight: 700 }}>
                          {team.seed ? `#${team.seed}` : '—'}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{team.teamName}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{team.captainName}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{team.players?.length || 0}</td>
                        <td><span className="badge badge-gold">{team.points || 0} pts</span></td>
                        <td>
                          {team.bracket === 'winners' && <span className="badge badge-gold">WB</span>}
                          {team.bracket === 'losers' && <span className="badge badge-blue">LB</span>}
                          {team.bracket === 'eliminated' && <span className="badge badge-red">Out</span>}
                          {team.bracket === 'champion' && <span className="badge badge-green">🏆 Champion</span>}
                          {(!team.bracket || team.bracket === 'pending') && <span className="badge badge-gray">—</span>}
                        </td>
                        <td><span className={`badge ${team.status === 'approved' ? 'badge-green' : team.status === 'rejected' ? 'badge-red' : 'badge-gray'}`}>{team.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FIXTURES */}
      {activeTab === 'fixtures' && (
        <div style={{ marginBottom: 40 }}>
          {matches.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-title">No fixtures generated yet</div>
              <div className="empty-state-desc">Admin will generate the fixture after all teams are registered</div>
            </div>
          ) : (
            <>
           {[
          { title: '🥇 Winners Bracket', list: winnerMatches, color: bracketColors.winners, show: true },
          { title: '🔁 Losers Bracket', list: loserMatches, color: bracketColors.losers, show: tournament.format !== 'single_knockout' },
          { title: '🏆 Grand Final', list: finalMatches, color: bracketColors.grand_final, show: tournament.format !== 'single_knockout' },
           ].map(({ title, list, color, show }) => show && list.length > 0 && (
       <div key={title} style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color, marginBottom: 14 }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {list.map(match => <MatchCard key={match._id} match={match} color={color} />)}
         </div>
         </div>
            ))}
            </>
          )}
        </div>
      )}

      {/* BRACKET */}
      {activeTab === 'bracket' && (
        <div style={{ marginBottom: 40 }}>
          <BracketInfoBox format={tournament.format} />
          {matches.length === 0 ? (
            <div className="empty-state card"><div className="empty-state-icon">🏆</div><div className="empty-state-title">Bracket not generated yet</div></div>
          ) : (
            <BracketView winnerMatches={winnerMatches} loserMatches={loserMatches} finalMatches={finalMatches} format={tournament.format} />
          )}
        </div>
      )}

      {/* Registration Modal */}
      {showRegModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowRegModal(false)}>
          <div className="modal" style={{ maxWidth: 680 }}>
            <button className="modal-close" onClick={() => setShowRegModal(false)}>✕</button>
            <h2 className="modal-title">✍️ Register Your Team</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: '0.875rem' }}>
              Tournament: <strong style={{ color: 'var(--text-primary)' }}>{tournament.name}</strong>
            </p>
            {regError && <div className="alert alert-error">{regError}</div>}
            {regSuccess && <div className="alert alert-success">{regSuccess}</div>}
            <form onSubmit={handleRegister}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Team Name *</label>
                  <input className="form-input" value={regForm.teamName} onChange={e => setRegForm({ ...regForm, teamName: e.target.value })} placeholder="e.g., Royal Challengers" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Captain Name *</label>
                  <input className="form-input" value={regForm.captainName} onChange={e => setRegForm({ ...regForm, captainName: e.target.value })} placeholder="e.g., Virat Kohli" required />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Captain Contact</label>
                  <input className="form-input" value={regForm.captainContact} onChange={e => setRegForm({ ...regForm, captainContact: e.target.value })} placeholder="+91 98765 43210" />
                </div>
                <div className="form-group">
                  <label className="form-label">Captain Email</label>
                  <input className="form-input" type="email" value={regForm.captainEmail} onChange={e => setRegForm({ ...regForm, captainEmail: e.target.value })} placeholder="captain@email.com" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Past Performance Points <span style={{ color: 'var(--text-muted)', textTransform: 'none', fontWeight: 400 }}>— used for seeding (higher = better seed)</span></label>
                <input className="form-input" type="number" min="0" value={regForm.points} onChange={e => setRegForm({ ...regForm, points: parseInt(e.target.value) || 0 })} placeholder="0" />
              </div>
              <div className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <label className="form-label" style={{ margin: 0 }}>Players <span style={{ color: 'var(--text-muted)', textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
                <button type="button" className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (regForm.players.length < tournament.playersPerTeam)
                      setRegForm(f => ({ ...f, players: [...f.players, { name: '', role: '' }] }));
                  }}>+ Add Player</button>
              </div>
              {regForm.players.map((player, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                  <input className="form-input" style={{ flex: 2 }} placeholder={`Player ${i + 1} name`}
                    value={player.name} onChange={e => {
                      const p = [...regForm.players]; p[i].name = e.target.value;
                      setRegForm({ ...regForm, players: p });
                    }} />
                  <select className="form-select" style={{ flex: 1 }} value={player.role}
                    onChange={e => {
                      const p = [...regForm.players]; p[i].role = e.target.value;
                      setRegForm({ ...regForm, players: p });
                    }}>
                    <option value="">Role</option>
                    {tournament.sport === 'cricket'
                      ? ['Batsman', 'Bowler', 'All-Rounder', 'Wicketkeeper'].map(r => <option key={r}>{r}</option>)
                      : tournament.sport === 'football'
                      ? ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'].map(r => <option key={r}>{r}</option>)
                      : ['Player', 'Captain', 'Vice Captain'].map(r => <option key={r}>{r}</option>)}
                  </select>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setRegForm(f => ({ ...f, players: f.players.filter((_, j) => j !== i) }))}>✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowRegModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={regLoading}>{regLoading ? 'Registering...' : '✍️ Submit Registration'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Single match card for fixtures tab
const MatchCard = ({ match, color }) => (
  <div style={{ background: 'var(--bg-card)', border: `1px solid ${color}30`, borderLeft: `3px solid ${color}`, borderRadius: 10, padding: '14px 18px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 4 }}>M{match.matchNumber}</span>
        <span style={{ fontSize: '0.8rem', color, fontWeight: 600 }}>{match.roundName}</span>
      </div>
      <span className={`badge ${match.status === 'completed' ? 'badge-green' : match.status === 'live' ? 'badge-gold' : match.status === 'bye' ? 'badge-blue' : 'badge-gray'}`}>
        {match.status?.toUpperCase()}
      </span>
    </div>

    {match.isBye ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{match.teamA?.teamName || 'TBD'}</span>
        <span className="badge badge-blue">BYE — Auto Advance</span>
      </div>
    ) : (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: match.winner?._id === match.teamA?._id ? 700 : 500, color: match.winner?._id === match.teamA?._id ? color : 'var(--text-primary)', fontSize: '0.95rem' }}>
            {match.teamA?.teamName || <span style={{ color: 'var(--text-muted)' }}>TBD</span>}
            {match.winner?._id === match.teamA?._id && ' ✓'}
          </div>
          {match.status === 'completed' && match.teamAScore && (
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem', color, marginTop: 2 }}>
              {match.teamAScore.runs}/{match.teamAScore.wickets} ({match.teamAScore.overs} ov)
            </div>
          )}
        </div>
        <div style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.8rem', padding: '4px 10px', background: 'var(--bg-secondary)', borderRadius: 6 }}>VS</div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontWeight: match.winner?._id === match.teamB?._id ? 700 : 500, color: match.winner?._id === match.teamB?._id ? color : 'var(--text-primary)', fontSize: '0.95rem' }}>
            {match.winner?._id === match.teamB?._id && '✓ '}
            {match.teamB?.teamName || <span style={{ color: 'var(--text-muted)' }}>TBD</span>}
          </div>
          {match.status === 'completed' && match.teamBScore && (
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem', color: bracketColors.losers, marginTop: 2 }}>
              {match.teamBScore.runs}/{match.teamBScore.wickets} ({match.teamBScore.overs} ov)
            </div>
          )}
        </div>
      </div>
    )}

    {match.venue && (
      <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
        <span>📍 {match.venue}</span>
        {match.scheduledDate && <span>📅 {new Date(match.scheduledDate).toLocaleDateString('en-IN')}</span>}
      </div>
    )}
  </div>
);

// Explains the tournament format in plain language, adapts to single/double knockout
const BracketInfoBox = ({ format }) => {
  const [expanded, setExpanded] = useState(true);
  const isSingle = format === 'single_knockout';

  return (
    <div className="card" style={{ marginBottom: 24, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          ℹ️ How does {isSingle ? 'Single' : 'Double'} Knockout work?
        </h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{expanded ? '▲ Hide' : '▼ Show'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {isSingle ? (
            <p>
              Every team has <strong style={{ color: 'var(--text-primary)' }}>one life</strong>. Lose a single
              match and you're eliminated immediately — win, and you move to the next round. The team left
              standing after the Final is the champion. There's no Losers Bracket in this format.
            </p>
          ) : (
            <>
              <p style={{ marginBottom: 10 }}>
                Every team gets <strong style={{ color: 'var(--text-primary)' }}>two lives</strong>. Lose once and
                you drop from the <span style={{ color: bracketColors.winners, fontWeight: 600 }}>Winners Bracket</span> into
                the <span style={{ color: bracketColors.losers, fontWeight: 600 }}>Losers Bracket</span>. Lose a second
                time and you're eliminated.
              </p>
              <p style={{ marginBottom: 10 }}>
                The team that never loses waits — undefeated — for the{' '}
                <span style={{ color: bracketColors.grand_final, fontWeight: 600 }}>Grand Final</span>. The Losers
                Bracket survivor has to beat them there to win the title.
              </p>
              <p>
                🔁 <strong style={{ color: 'var(--text-primary)' }}>Bracket reset:</strong> if the Losers Bracket
                team wins that first Grand Final match, both teams are tied at one loss each — so a second, final
                match decides the champion.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Bracket view: grouped by round, color-coded by bracket type
const BracketView = ({ winnerMatches, loserMatches, finalMatches,format  }) => {
   const isSingleKnockout = format === 'single_knockout';
  const groupByRound = (arr) => {
    const map = {};
    for (const m of arr) {
      if (!map[m.round]) map[m.round] = [];
      map[m.round].push(m);
    }
    return Object.entries(map).sort(([a], [b]) => Number(a) - Number(b));
  };

  const wbGroups = groupByRound(winnerMatches);
  const lbGroups = groupByRound(loserMatches);

  const BracketMatch = ({ match, color }) => (
    <div style={{ background: 'var(--bg-secondary)', border: `1px solid ${color}35`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '10px 14px', minWidth: 200, maxWidth: 240 }}>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 6, display: 'flex', gap: 6 }}>
        <span style={{ background: 'var(--bg-card)', padding: '1px 6px', borderRadius: 3, fontFamily: 'JetBrains Mono' }}>M{match.matchNumber}</span>
        <span style={{ color }}>{match.roundName}</span>
      </div>
      {match.isBye ? (
        <>
          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: 3 }}>{match.teamA?.teamName || 'TBD'}</div>
          <div className="badge badge-blue" style={{ fontSize: '0.6rem' }}>BYE</div>
        </>
      ) : (
        <>
          <div style={{ fontWeight: match.winner && match.winner._id === match.teamA?._id ? 700 : 400, color: match.winner && match.winner._id === match.teamA?._id ? color : 'var(--text-primary)', fontSize: '0.82rem', marginBottom: 2 }}>
            {match.teamA?.teamName || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>TBD</span>}
            {match.winner && match.winner._id === match.teamA?._id && ' ✓'}
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '5px 0' }} />
          <div style={{ fontWeight: match.winner && match.winner._id === match.teamB?._id ? 700 : 400, color: match.winner && match.winner._id === match.teamB?._id ? color : 'var(--text-primary)', fontSize: '0.82rem' }}>
            {match.teamB?.teamName || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>TBD</span>}
            {match.winner && match.winner._id === match.teamB?._id && ' ✓'}
          </div>
        </>
      )}
      <div style={{ marginTop: 6 }}>
        <span className={`badge ${match.status === 'completed' ? 'badge-green' : match.status === 'live' ? 'badge-gold' : match.status === 'bye' ? 'badge-blue' : 'badge-gray'}`} style={{ fontSize: '0.58rem' }}>
          {match.status?.toUpperCase()}
        </span>
      </div>
    </div>
  );

// Update RoundCol to accept isLast and draw a connector arrow to the next round
const RoundCol = ({ label, matches, color, isLast }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 10px', background: `${color}12`, borderRadius: 4, textAlign: 'center' }}>
        {label}
      </div>
      {matches.map(m => <BracketMatch key={m._id} match={m} color={color} />)}
    </div>
    {!isLast && <div style={{ fontSize: '1.3rem', color: 'var(--text-muted)', alignSelf: 'center' }}>→</div>}
  </div>
);

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {wbGroups.length > 0 && <span className="badge badge-gold">🥇 Winners Bracket</span>}
        {!isSingleKnockout && lbGroups.length > 0 && <span className="badge badge-blue">🔁 Losers Bracket</span>}
        {!isSingleKnockout && finalMatches.length > 0 && <span className="badge badge-purple">🏆 Grand Final</span>}
      </div>
      {!isSingleKnockout && (
     <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 20 }}>
    🥇 Still undefeated &nbsp;·&nbsp; 🔁 One loss — must   win to survive &nbsp;·&nbsp; 🏆 Decides the champion
     </p>
      )}
      {/* Winners Bracket */}
      {wbGroups.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            🥇 Winners Bracket
          </div>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
            {wbGroups.map(([round, ms],idx) => (
              <RoundCol key={round} label={ms[0]?.roundName || `WB R${round}`} matches={ms} color={bracketColors.winners} isLast={idx === wbGroups.length - 1} />
            ))}
          </div>
        </div>
      )}

      {/* Losers Bracket */}
      {!isSingleKnockout && lbGroups.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            🔁 Losers Bracket
          </div>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
            {lbGroups.map(([round, ms],idx) => (
              <RoundCol key={round} label={ms[0]?.roundName || `LB R${round}`} matches={ms} color={bracketColors.losers} isLast={idx === lbGroups.length - 1}/>
            ))}
          </div>
        </div>
      )}

      {/* Grand Final */}
      {!isSingleKnockout && finalMatches.length > 0 && (
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-purple)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            🏆 Grand Final
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {finalMatches.map(m => <BracketMatch key={m._id} match={m} color={bracketColors.grand_final} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentDetail;
