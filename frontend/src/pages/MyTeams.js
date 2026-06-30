import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { teamAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const MyTeams = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teamAPI.getMyTeams()
      .then(res => { setTeams(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const borderColor = (status) => {
    if (status === 'approved') return 'var(--green)';
    if (status === 'rejected') return 'var(--red)';
    return 'var(--gold)';
  };

  return (
    <div className="page-container page-wrapper fade-in">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--royal)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 24, height: 2, background: 'var(--royal)', display: 'inline-block' }}></span>
          Team Management
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--navy)' }}>My Teams</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Track your team registrations and their approval status</p>
          </div>
          <Link to="/tournaments" className="btn btn-royal">+ Register in a Tournament</Link>
        </div>
      </div>

      {/* Stats row */}
      {!loading && teams.length > 0 && (
        <div className="grid-4" style={{ marginBottom: 32 }}>
          {[
            { label: 'Total Registered', value: teams.length, color: 'var(--navy)' },
            { label: 'Approved', value: teams.filter(t => t.status === 'approved').length, color: 'var(--green)' },
            { label: 'Pending', value: teams.filter(t => t.status === 'pending').length, color: 'var(--gold)' },
            { label: 'Rejected', value: teams.filter(t => t.status === 'rejected').length, color: 'var(--red)' },
          ].map((s, i) => (
            <div key={i} className="stat-box" style={{ borderTop: `3px solid ${s.color}` }}>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? <div className="spinner" /> : teams.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>👥</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>No teams registered yet</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.875rem' }}>Browse open tournaments and register your team to get started</p>
          <Link to="/tournaments" className="btn btn-primary btn-lg">Browse Tournaments</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
          {teams.map(team => (
            <div key={team._id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderLeft: `4px solid ${borderColor(team.status)}`,
              borderRadius: 12, padding: '24px', boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  {/* Team header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <h3 style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--navy)' }}>{team.teamName}</h3>
                    <span className={`badge ${team.status === 'approved' ? 'badge-green' : team.status === 'rejected' ? 'badge-red' : 'badge-gold'}`}>
                      {team.status === 'approved' ? '✅ Approved' : team.status === 'rejected' ? '❌ Rejected' : '⏳ Pending Review'}
                    </span>
                  </div>

                  {/* Info grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px 24px', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      🏆 <strong style={{ color: 'var(--navy)' }}>{team.tournament?.name}</strong>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      🏅 {team.tournament?.sport?.charAt(0).toUpperCase() + team.tournament?.sport?.slice(1)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      👤 Captain: <strong style={{ color: 'var(--text-primary)' }}>{team.captainName}</strong>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      👥 {team.players?.length || 0} players registered
                    </div>
                    {team.wins > 0 || team.losses > 0 ? (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        📊 W: <span style={{ color: 'var(--green)', fontWeight: 700 }}>{team.wins || 0}</span> &nbsp; L: <span style={{ color: 'var(--red)', fontWeight: 700 }}>{team.losses || 0}</span>
                      </div>
                    ) : null}
                    {team.bracket && team.bracket !== 'pending' && (
                      <div style={{ fontSize: '0.85rem' }}>
                        {team.bracket === 'winners' && <span className="badge badge-gold">🥇 Winners Bracket</span>}
                        {team.bracket === 'losers' && <span className="badge badge-blue">🔁 Losers Bracket</span>}
                        {team.bracket === 'eliminated' && <span className="badge badge-red">Eliminated</span>}
                        {team.bracket === 'champion' && <span className="badge badge-green">🏆 Champion!</span>}
                      </div>
                    )}
                  </div>

                  {/* Players */}
                  {team.players?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Squad</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {team.players.map((p, i) => (
                          <span key={i} className="badge badge-gray">{p.name}{p.role ? ` · ${p.role}` : ''}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status alerts */}
                  {team.status === 'pending' && (
                    <div className="alert alert-warning" style={{ marginTop: 14, marginBottom: 0 }}>
                      ⏳ Your registration is <strong>pending admin review</strong>. You'll be notified once approved.
                    </div>
                  )}
                  {team.status === 'rejected' && (
                    <div className="alert alert-error" style={{ marginTop: 14, marginBottom: 0 }}>
                      ❌ Your registration was <strong>not approved</strong>. Contact the tournament admin for more info.
                    </div>
                  )}
                  {team.status === 'approved' && (
                    <div className="alert alert-success" style={{ marginTop: 14, marginBottom: 0 }}>
                      ✅ Your team is <strong>approved and competing</strong>! Follow your progress in the tournament bracket.
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  <Link to={`/tournaments/${team.tournament?._id}`} className="btn btn-royal btn-sm">View Tournament →</Link>
                  {team.status === 'approved' && (
                    <Link to={`/tournaments/${team.tournament?._id}`} className="btn btn-secondary btn-sm">📊 See Bracket</Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTeams;
