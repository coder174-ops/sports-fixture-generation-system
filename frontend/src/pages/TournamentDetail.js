import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tournamentAPI, teamAPI, matchAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const sportEmoji = { cricket:'🏏', football:'⚽', basketball:'🏀', badminton:'🏸', tennis:'🎾', volleyball:'🏐', other:'🏅' };

const statusBadge = (status) => {
  const map = {
    registration_open: ['badge-green','Registration Open'],
    registration_closed: ['badge-gray','Registration Closed'],
    fixture_generated: ['badge-blue','Fixture Ready'],
    ongoing: ['badge-live','● Live'],
    completed: ['badge-navy','Completed'],
    upcoming: ['badge-orange','Upcoming'],
  };
  const [cls, label] = map[status] || ['badge-gray', status];
  return <span className={`badge ${cls}`}>{label}</span>;
};

// ── Points Table calculator ──────────────────────────────────────────
const buildPointsTable = (teams, matches) => {
  const approved = teams.filter(t => t.status === 'approved');
  const completed = matches.filter(m => m.status === 'completed' && !m.isBye && m.winner);

  const stats = {};
  for (const t of approved) {
    stats[t._id] = {
      team: t, played: 0, won: 0, lost: 0, points: 0,
      runsFor: 0, runsAgainst: 0, oversFor: 0, oversAgainst: 0, nrr: 0
    };
  }

  for (const m of completed) {
    const aId = m.teamA?._id?.toString();
    const bId = m.teamB?._id?.toString();
    const wId = m.winner?._id?.toString();
    if (!aId || !bId || !wId) continue;

    if (stats[aId]) {
      stats[aId].played++;
      if (wId === aId) { stats[aId].won++; stats[aId].points += 2; }
      else stats[aId].lost++;
      if (m.teamAScore?.runs) { stats[aId].runsFor += m.teamAScore.runs; stats[aId].oversFor += m.teamAScore.overs || 0; }
      if (m.teamBScore?.runs) { stats[aId].runsAgainst += m.teamBScore.runs; stats[aId].oversAgainst += m.teamBScore.overs || 0; }
    }
    if (stats[bId]) {
      stats[bId].played++;
      if (wId === bId) { stats[bId].won++; stats[bId].points += 2; }
      else stats[bId].lost++;
      if (m.teamBScore?.runs) { stats[bId].runsFor += m.teamBScore.runs; stats[bId].oversFor += m.teamBScore.overs || 0; }
      if (m.teamAScore?.runs) { stats[bId].runsAgainst += m.teamAScore.runs; stats[bId].oversAgainst += m.teamAScore.overs || 0; }
    }
  }

  return Object.values(stats).map(s => {
    const rrf = s.oversFor > 0 ? s.runsFor / s.oversFor : 0;
    const rra = s.oversAgainst > 0 ? s.runsAgainst / s.oversAgainst : 0;
    s.nrr = parseFloat((rrf - rra).toFixed(3));
    return s;
  }).sort((a, b) => b.points - a.points || b.nrr - a.nrr || b.won - a.won);
};

// ── Match Summary (completed) ────────────────────────────────────────
const MatchSummary = ({ match }) => {
  const isCricket = match.teamAScore?.runs !== undefined;
  const winner = match.winner;
  const teamA = match.teamA;
  const teamB = match.teamB;
  const isAWinner = winner?._id === teamA?._id || winner?.teamName === teamA?.teamName;

  return (
    <div style={{background:'var(--bg-card)',border:'1.5px solid var(--border)',borderRadius:14,overflow:'hidden',boxShadow:'var(--shadow-sm)',marginBottom:16}}>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,var(--navy-dark),var(--navy))',padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{background:'rgba(255,255,255,0.1)',borderRadius:4,padding:'2px 8px',fontSize:'0.7rem',color:'rgba(255,255,255,0.7)',fontWeight:600}}>M{match.matchNumber}</span>
          <span style={{fontSize:'0.8rem',color:'rgba(255,255,255,0.85)',fontWeight:600}}>{match.roundName}</span>
        </div>
        <span className="badge badge-green" style={{fontSize:'0.65rem'}}>✓ COMPLETED</span>
      </div>

      {/* Score area */}
      <div style={{padding:'20px',display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:16,alignItems:'center'}}>
        {/* Team A */}
        <div style={{textAlign:'left'}}>
          <div style={{fontSize:'1rem',fontWeight:isAWinner?800:500,color:isAWinner?'var(--navy)':'var(--text-secondary)',marginBottom:4}}>
            {isAWinner && <span style={{color:'var(--gold)',marginRight:4}}>🏆</span>}
            {teamA?.teamName || 'TBD'}
          </div>
          {isCricket && match.teamAScore && (
            <div style={{fontSize:'1.3rem',fontWeight:800,color:isAWinner?'var(--navy)':'var(--text-muted)',fontFamily:'monospace'}}>
              {match.teamAScore.runs}/{match.teamAScore.wickets}
              <span style={{fontSize:'0.8rem',fontWeight:400,color:'var(--text-muted)',marginLeft:4}}>({match.teamAScore.overs} ov)</span>
            </div>
          )}
          {isAWinner && <span className="badge badge-gold" style={{marginTop:6}}>Winner</span>}
          {!isAWinner && match.winner && <span className="badge badge-gray" style={{marginTop:6}}>Runner-up</span>}
        </div>

        {/* VS */}
        <div style={{textAlign:'center'}}>
          <div style={{width:44,height:44,borderRadius:'50%',background:'var(--bg-secondary)',border:'2px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75rem',fontWeight:700,color:'var(--text-muted)',margin:'0 auto'}}>VS</div>
        </div>

        {/* Team B */}
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:'1rem',fontWeight:!isAWinner?800:500,color:!isAWinner?'var(--navy)':'var(--text-secondary)',marginBottom:4}}>
            {teamB?.teamName || 'TBD'}
            {!isAWinner && match.winner && <span style={{color:'var(--gold)',marginLeft:4}}>🏆</span>}
          </div>
          {isCricket && match.teamBScore && (
            <div style={{fontSize:'1.3rem',fontWeight:800,color:!isAWinner&&match.winner?'var(--navy)':'var(--text-muted)',fontFamily:'monospace'}}>
              {match.teamBScore.runs}/{match.teamBScore.wickets}
              <span style={{fontSize:'0.8rem',fontWeight:400,color:'var(--text-muted)',marginLeft:4}}>({match.teamBScore.overs} ov)</span>
            </div>
          )}
          {!isAWinner && match.winner && <span className="badge badge-gold" style={{marginTop:6}}>Winner</span>}
          {isAWinner && <span className="badge badge-gray" style={{marginTop:6}}>Runner-up</span>}
        </div>
      </div>

      {/* Footer */}
      <div style={{padding:'10px 20px',background:'var(--bg-primary)',borderTop:'1px solid var(--border)',display:'flex',gap:20,fontSize:'0.78rem',color:'var(--text-muted)'}}>
        {match.venue && <span>📍 {match.venue}</span>}
        {match.scheduledDate && <span>📅 {new Date(match.scheduledDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>}
        {match.notes && <span>📝 {match.notes}</span>}
      </div>
    </div>
  );
};

// ── Live Match Card ──────────────────────────────────────────────────
const LiveMatchCard = ({ match }) => {
  const teamA = match.teamA;
  const teamB = match.teamB;
  const isCricket = match.teamAScore?.runs !== undefined;

  return (
    <div style={{background:'var(--bg-card)',border:'2px solid var(--red)',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(192,57,43,0.15)',marginBottom:16}}>
      <div style={{background:'var(--red)',padding:'10px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{color:'#fff',fontWeight:700,fontSize:'0.82rem',display:'flex',alignItems:'center',gap:6}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#fff',display:'inline-block',animation:'pulse 1s infinite'}}></span>
          LIVE · {match.roundName}
        </span>
        <span style={{color:'rgba(255,255,255,0.8)',fontSize:'0.72rem'}}>M{match.matchNumber}</span>
      </div>
      <div style={{padding:'20px',display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:16,alignItems:'center'}}>
        <div>
          <div style={{fontWeight:700,color:'var(--navy)',marginBottom:4}}>{teamA?.teamName || 'TBD'}</div>
          {isCricket && match.teamAScore && (
            <div style={{fontSize:'1.5rem',fontWeight:800,color:'var(--navy)',fontFamily:'monospace'}}>
              {match.teamAScore.runs}/{match.teamAScore.wickets}
              <span style={{fontSize:'0.8rem',color:'var(--text-muted)',fontWeight:400,marginLeft:4}}>({match.teamAScore.overs} ov)</span>
            </div>
          )}
        </div>
        <div style={{textAlign:'center'}}>
          <div style={{width:44,height:44,borderRadius:'50%',background:'var(--red)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75rem',fontWeight:800,color:'#fff',margin:'0 auto'}}>VS</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontWeight:700,color:'var(--navy)',marginBottom:4}}>{teamB?.teamName || 'TBD'}</div>
          {isCricket && match.teamBScore && (
            <div style={{fontSize:'1.5rem',fontWeight:800,color:'var(--navy)',fontFamily:'monospace'}}>
              {match.teamBScore.runs}/{match.teamBScore.wickets}
              <span style={{fontSize:'0.8rem',color:'var(--text-muted)',fontWeight:400,marginLeft:4}}>({match.teamBScore.overs} ov)</span>
            </div>
          )}
        </div>
      </div>
      {match.venue && (
        <div style={{padding:'8px 20px',background:'var(--red-bg)',borderTop:'1px solid var(--border)',fontSize:'0.78rem',color:'var(--text-muted)'}}>
          📍 {match.venue}
        </div>
      )}
    </div>
  );
};

// ── Scheduled Match Card ─────────────────────────────────────────────
const ScheduledMatchCard = ({ match, color }) => (
  <div style={{background:'var(--bg-card)',border:`1px solid ${color}30`,borderLeft:`3px solid ${color}`,borderRadius:10,padding:'14px 18px',marginBottom:10}}>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,flexWrap:'wrap',gap:6}}>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <span style={{fontFamily:'monospace',fontSize:'0.72rem',color:'var(--text-muted)',background:'var(--bg-secondary)',padding:'2px 8px',borderRadius:4}}>M{match.matchNumber}</span>
        <span style={{fontSize:'0.8rem',color,fontWeight:600}}>{match.roundName}</span>
      </div>
      <span className={`badge ${match.status==='live'?'badge-live':match.status==='bye'?'badge-blue':'badge-gray'}`} style={{fontSize:'0.65rem'}}>
        {match.isBye?'BYE':match.status?.toUpperCase()}
      </span>
    </div>
    {match.isBye ? (
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontWeight:700,color:'var(--text-primary)'}}>{match.teamA?.teamName||'TBD'}</span>
        <span className="badge badge-blue" style={{fontSize:'0.65rem'}}>Auto Advance</span>
      </div>
    ) : (
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{flex:1,fontWeight:500,color:'var(--text-primary)'}}>{match.teamA?.teamName||<span style={{color:'var(--text-muted)',fontStyle:'italic'}}>TBD</span>}</div>
        <div style={{color:'var(--text-muted)',fontWeight:700,fontSize:'0.78rem',padding:'4px 10px',background:'var(--bg-secondary)',borderRadius:6}}>VS</div>
        <div style={{flex:1,textAlign:'right',fontWeight:500,color:'var(--text-primary)'}}>{match.teamB?.teamName||<span style={{color:'var(--text-muted)',fontStyle:'italic'}}>TBD</span>}</div>
      </div>
    )}
    {match.venue && (
      <div style={{marginTop:8,fontSize:'0.75rem',color:'var(--text-muted)',display:'flex',gap:12}}>
        <span>📍 {match.venue}</span>
        {match.scheduledDate&&<span>📅 {new Date(match.scheduledDate).toLocaleDateString('en-IN')}</span>}
      </div>
    )}
  </div>
);

// ── Points Table component ───────────────────────────────────────────
const PointsTable = ({ teams, matches, isCricket }) => {
  const rows = buildPointsTable(teams, matches);
  if (rows.length === 0) return (
    <div className="empty-state"><div className="empty-icon">📊</div><div className="empty-title">No teams yet</div></div>
  );

  return (
    <div className="table-wrap">
      <table className="data-table pts-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>P</th>
            <th>W</th>
            <th>L</th>
            <th>Pts</th>
            {isCricket && <th>NRR</th>}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team._id}>
              <td><span className={`pts-rank ${i===0?'pts-rank-1':i===1?'pts-rank-2':i===2?'pts-rank-3':''}`}>{i+1}</span></td>
              <td><strong style={{color:'var(--navy)'}}>{r.team.teamName}</strong><div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{r.team.captainName}</div></td>
              <td>{r.played}</td>
              <td style={{color:'var(--green)',fontWeight:600}}>{r.won}</td>
              <td style={{color:'var(--red)',fontWeight:600}}>{r.lost}</td>
              <td><strong style={{color:'var(--navy)',fontSize:'1rem'}}>{r.points}</strong></td>
              {isCricket && <td style={{color:r.nrr>=0?'var(--green)':'var(--red)',fontWeight:600}}>{r.nrr>=0?'+':''}{r.nrr}</td>}
              <td>
                {r.team.bracket==='winners'&&<span className="badge badge-gold">WB</span>}
                {r.team.bracket==='losers'&&<span className="badge badge-blue">LB</span>}
                {r.team.bracket==='eliminated'&&<span className="badge badge-red">Eliminated</span>}
                {r.team.bracket==='champion'&&<span className="badge badge-green">🏆 Champion</span>}
                {(!r.team.bracket||r.team.bracket==='pending')&&<span className="badge badge-gray">Pending</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Bracket View ─────────────────────────────────────────────────────
const BracketView = ({ winnerMatches, loserMatches, finalMatches }) => {
  const groupByRound = arr => {
    const map = {};
    for (const m of arr) { if (!map[m.round]) map[m.round]=[]; map[m.round].push(m); }
    return Object.entries(map).sort(([a],[b])=>Number(a)-Number(b));
  };

  const BMini = ({ match, color }) => {
    const isAWin = match.winner && (match.winner._id === match.teamA?._id || match.winner.teamName === match.teamA?.teamName);
    return (
      <div style={{background:'var(--bg-card)',border:`1px solid ${color}35`,borderLeft:`3px solid ${color}`,borderRadius:8,padding:'10px 14px',minWidth:200,maxWidth:240}}>
        <div style={{fontSize:'0.65rem',color:'var(--text-muted)',marginBottom:6,display:'flex',gap:6}}>
          <span style={{background:'var(--bg-secondary)',padding:'1px 6px',borderRadius:3,fontFamily:'monospace'}}>M{match.matchNumber}</span>
          <span style={{color}}>{match.roundName}</span>
        </div>
        {match.isBye ? (
          <><div style={{fontWeight:600,fontSize:'0.82rem',color:'var(--text-primary)',marginBottom:3}}>{match.teamA?.teamName||'TBD'}</div><span className="badge badge-blue" style={{fontSize:'0.6rem'}}>BYE</span></>
        ) : (<>
          <div style={{fontWeight:isAWin?700:400,color:isAWin?color:'var(--text-primary)',fontSize:'0.82rem',marginBottom:2}}>
            {match.teamA?.teamName||<span style={{color:'var(--text-muted)',fontStyle:'italic'}}>TBD</span>}{isAWin?' ✓':''}
          </div>
          <div style={{height:1,background:'var(--border)',margin:'5px 0'}}/>
          <div style={{fontWeight:!isAWin&&match.winner?700:400,color:!isAWin&&match.winner?color:'var(--text-primary)',fontSize:'0.82rem'}}>
            {match.teamB?.teamName||<span style={{color:'var(--text-muted)',fontStyle:'italic'}}>TBD</span>}{!isAWin&&match.winner?' ✓':''}
          </div>
        </>)}
        <div style={{marginTop:6}}>
          <span className={`badge ${match.status==='completed'?'badge-green':match.status==='live'?'badge-live':match.status==='bye'?'badge-blue':'badge-gray'}`} style={{fontSize:'0.58rem'}}>
            {match.status==='live'?'● LIVE':match.status?.toUpperCase()}
          </span>
        </div>
      </div>
    );
  };

  const RoundCol = ({label,matches,color}) => (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{fontSize:'0.68rem',fontWeight:700,color,textTransform:'uppercase',letterSpacing:'0.08em',padding:'4px 10px',background:`${color}12`,borderRadius:4,textAlign:'center',border:`1px solid ${color}20`}}>{label}</div>
      {matches.map(m=><BMini key={m._id} match={m} color={color}/>)}
    </div>
  );

  const wbG=groupByRound(winnerMatches), lbG=groupByRound(loserMatches);
  const WB='#C8963E', LB='#2B4C8C', GF='#1B2A4A';
  return (
    <div>
      <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        <span className="badge badge-gold">🥇 Winners Bracket</span>
        <span className="badge badge-blue">🔁 Losers Bracket</span>
        <span className="badge badge-navy">🏆 Grand Final</span>
      </div>
      {wbG.length>0&&<div style={{marginBottom:32}}>
        <div style={{fontSize:'0.75rem',fontWeight:700,color:WB,marginBottom:12,textTransform:'uppercase',letterSpacing:'0.1em'}}>🥇 Winners Bracket</div>
        <div style={{display:'flex',gap:16,overflowX:'auto',paddingBottom:8}}>{wbG.map(([r,ms])=><RoundCol key={r} label={ms[0]?.roundName||`WB R${r}`} matches={ms} color={WB}/>)}</div>
      </div>}
      {lbG.length>0&&<div style={{marginBottom:32}}>
        <div style={{fontSize:'0.75rem',fontWeight:700,color:LB,marginBottom:12,textTransform:'uppercase',letterSpacing:'0.1em'}}>🔁 Losers Bracket</div>
        <div style={{display:'flex',gap:16,overflowX:'auto',paddingBottom:8}}>{lbG.map(([r,ms])=><RoundCol key={r} label={ms[0]?.roundName||`LB R${r}`} matches={ms} color={LB}/>)}</div>
      </div>}
      {finalMatches.length>0&&<div>
        <div style={{fontSize:'0.75rem',fontWeight:700,color:GF,marginBottom:12,textTransform:'uppercase',letterSpacing:'0.1em'}}>🏆 Grand Final</div>
        <div style={{display:'flex',gap:16}}>{finalMatches.map(m=><BMini key={m._id} match={m} color={GF}/>)}</div>
      </div>}
    </div>
  );
};

// ── Main TournamentDetail component ─────────────────────────────────
const TournamentDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [showRegModal, setShowRegModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [regForm, setRegForm] = useState({ teamName:'', captainName:'', captainContact:'', captainEmail:'', players:[], points:0 });
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [t, tm, m] = await Promise.all([tournamentAPI.getOne(id), teamAPI.getByTournament(id), matchAPI.getByTournament(id)]);
      setTournament(t.data); setTeams(tm.data); setMatches(m.data);
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRegister = async (e) => {
    e.preventDefault(); setRegError(''); setRegSuccess('');
    if (!regForm.teamName||!regForm.captainName) return setRegError('Team name and captain name are required');
    setRegLoading(true);
    try {
      await teamAPI.register({ tournamentId: id, ...regForm });
      setRegSuccess('Team registered! Pending admin approval.');
      setTimeout(() => { setShowRegModal(false); setRegSuccess(''); }, 3000);
      const tm = await teamAPI.getByTournament(id);
      setTeams(tm.data);
    } catch (err) { setRegError(err.response?.data?.message || 'Registration failed'); }
    setRegLoading(false);
  };

  if (loading) return <div className="page-container"><div className="spinner"/></div>;
  if (!tournament) return <div className="page-container page-wrapper"><div className="alert alert-error">Tournament not found</div></div>;

  const approvedTeams = teams.filter(t => t.status === 'approved');
  const liveMatches = matches.filter(m => m.status === 'live');
  const completedMatches = matches.filter(m => m.status === 'completed' && !m.isBye);
  const scheduledMatches = matches.filter(m => m.status === 'scheduled');
  const winnerMatches = matches.filter(m => m.bracketType === 'winners').sort((a,b)=>a.matchNumber-b.matchNumber);
  const loserMatches = matches.filter(m => m.bracketType === 'losers').sort((a,b)=>a.matchNumber-b.matchNumber);
  const finalMatches = matches.filter(m => m.bracketType === 'grand_final').sort((a,b)=>a.matchNumber-b.matchNumber);
  const isCricket = tournament.sport === 'cricket';

  const tabs = [
    {id:'overview',label:'Overview'},
    {id:'scores',label:`Scores ${liveMatches.length>0?'🔴':''}`},
    {id:'points',label:'Points Table'},
    {id:'fixtures',label:'Fixtures'},
    {id:'bracket',label:'Bracket'},
    {id:'teams',label:'Teams'},
  ];

  return (
    <div className="page-container page-wrapper fade-in">
      {/* Header */}
      <div style={{marginBottom:28}}>
        <Link to="/tournaments" style={{color:'var(--royal)',textDecoration:'none',fontSize:'0.82rem',display:'inline-flex',alignItems:'center',gap:6,marginBottom:16,fontWeight:500}}>
          ← Back to Tournaments
        </Link>
        <div style={{background:'linear-gradient(135deg,var(--navy-dark),var(--navy))',borderRadius:16,padding:'28px 32px',color:'#fff',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:16}}>
          <div style={{display:'flex',gap:20,alignItems:'center'}}>
            <div style={{fontSize:'3.5rem',background:'rgba(255,255,255,0.08)',borderRadius:14,width:72,height:72,display:'flex',alignItems:'center',justifyContent:'center'}}>{sportEmoji[tournament.sport]||'🏅'}</div>
            <div>
              <h1 style={{fontSize:'1.8rem',fontWeight:800,color:'#fff',marginBottom:10,lineHeight:1.1}}>{tournament.name}</h1>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <span className="badge badge-gold">{tournament.sport?.toUpperCase()}</span>
                {statusBadge(tournament.status)}
                <span className="badge badge-blue">🔄 Double Knockout</span>
                {liveMatches.length>0&&<span className="badge badge-live">🔴 {liveMatches.length} Live</span>}
              </div>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8,alignItems:'flex-end'}}>
            {tournament.status==='registration_open'&&user&&(
              <button className="btn btn-gold btn-lg" onClick={()=>setShowRegModal(true)}>✍️ Register Team</button>
            )}
            {tournament.status==='registration_open'&&!user&&(
              <Link to="/login" className="btn btn-gold btn-lg">Login to Register</Link>
            )}
            {!user&&<Link to="/tournaments" style={{color:'rgba(255,255,255,0.5)',fontSize:'0.78rem',textAlign:'center'}}>Viewing as guest</Link>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(t=>(
          <button key={t.id} className={`tab-btn ${activeTab===t.id?'active':''}`} onClick={()=>setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab==='overview'&&(
        <div className="fade-in">
          {liveMatches.length>0&&(
            <div style={{marginBottom:32}}>
              <h3 style={{fontSize:'1rem',fontWeight:700,color:'var(--red)',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:10,height:10,borderRadius:'50%',background:'var(--red)',display:'inline-block',animation:'pulse 1s infinite'}}></span>
                Live Matches
              </h3>
              {liveMatches.map(m=><LiveMatchCard key={m._id} match={m}/>)}
            </div>
          )}
          <div className="grid-4" style={{marginBottom:32}}>
            {[
              {label:'Sport',value:tournament.sport?.charAt(0).toUpperCase()+tournament.sport?.slice(1)},
              {label:'Teams',value:`${approvedTeams.length}/${tournament.maxTeams}`},
              {label:'Matches',value:matches.filter(m=>!m.isBye).length},
              {label:'Completed',value:completedMatches.length},
            ].map((s,i)=>(
              <div key={i} className="stat-box">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="grid-2" style={{marginBottom:32}}>
            <div className="card">
              <h4 style={{fontWeight:700,color:'var(--navy)',marginBottom:16,fontSize:'0.95rem'}}>📋 Tournament Details</h4>
              {[
                ['📍 Venue', tournament.venue],
                ['👥 Players/Team', tournament.playersPerTeam],
                ['📅 Start Date', tournament.startDate?new Date(tournament.startDate).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}):'TBD'],
                ['📅 End Date', tournament.endDate?new Date(tournament.endDate).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}):'TBD'],
                isCricket&&['🏏 Overs', tournament.overs],
                tournament.prizeInfo&&['🏆 Prize', tournament.prizeInfo],
                tournament.registrationDeadline&&['⏰ Reg. Deadline', new Date(tournament.registrationDeadline).toLocaleDateString('en-IN')],
              ].filter(Boolean).map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border-light)',fontSize:'0.875rem'}}>
                  <span style={{color:'var(--text-muted)'}}>{k}</span>
                  <span style={{fontWeight:600,color:'var(--navy)'}}>{v}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <h4 style={{fontWeight:700,color:'var(--navy)',marginBottom:16,fontSize:'0.95rem'}}>📊 Quick Points Table</h4>
              {approvedTeams.length===0?(
                <div className="empty-state" style={{padding:'24px 0'}}><div className="empty-icon">👥</div><div className="empty-title" style={{fontSize:'0.9rem'}}>No approved teams yet</div></div>
              ):(
                <PointsTable teams={teams} matches={matches} isCricket={isCricket}/>
              )}
            </div>
          </div>
          {tournament.description&&(
            <div className="card"><h4 style={{fontWeight:700,color:'var(--navy)',marginBottom:12}}>📝 Description</h4><p style={{color:'var(--text-secondary)',lineHeight:1.8,fontSize:'0.9rem'}}>{tournament.description}</p></div>
          )}
        </div>
      )}

      {/* SCORES TAB */}
      {activeTab==='scores'&&(
        <div className="fade-in">
          {liveMatches.length>0&&(
            <div style={{marginBottom:32}}>
              <h3 style={{fontSize:'1rem',fontWeight:700,color:'var(--red)',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>● Live Now</h3>
              {liveMatches.map(m=><LiveMatchCard key={m._id} match={m}/>)}
            </div>
          )}
          {completedMatches.length>0&&(
            <div>
              <h3 style={{fontSize:'1rem',fontWeight:700,color:'var(--navy)',marginBottom:14}}>✓ Match Summaries</h3>
              {completedMatches.sort((a,b)=>b.matchNumber-a.matchNumber).map(m=><MatchSummary key={m._id} match={m}/>)}
            </div>
          )}
          {liveMatches.length===0&&completedMatches.length===0&&(
            <div className="empty-state card"><div className="empty-icon">📺</div><div className="empty-title">No scores yet</div><div className="empty-desc">Scores will appear here once matches begin</div></div>
          )}
        </div>
      )}

      {/* POINTS TABLE TAB */}
      {activeTab==='points'&&(
        <div className="fade-in">
          <div className="card" style={{marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
              <div>
                <h3 style={{fontSize:'1.1rem',fontWeight:700,color:'var(--navy)'}}>📊 Points Table</h3>
                <p style={{fontSize:'0.82rem',color:'var(--text-muted)',marginTop:4}}>
                  Points: Win = 2 pts, Loss = 0 pts{isCricket&&' · NRR = Net Run Rate (Runs/Over scored − Runs/Over conceded)'}
                </p>
              </div>
              <div style={{display:'flex',gap:8,fontSize:'0.78rem',color:'var(--text-muted)'}}>
                <span className="badge badge-gold">#1</span>
                <span className="badge badge-gray">#2</span>
                <span className="badge badge-orange">#3</span>
              </div>
            </div>
            <PointsTable teams={teams} matches={matches} isCricket={isCricket}/>
          </div>
          <div className="card" style={{background:'var(--blue-light)',border:'1px solid #C0D4F0'}}>
            <div style={{fontSize:'0.82rem',color:'var(--royal)',lineHeight:1.8}}>
              <strong>How points are calculated:</strong><br/>
              • Each win = <strong>2 points</strong> | Each loss = <strong>0 points</strong><br/>
              • Tiebreaker: Net Run Rate (NRR) = (Runs scored ÷ Overs faced) − (Runs conceded ÷ Overs bowled)<br/>
              • Table updates automatically after each match result is entered
            </div>
          </div>
        </div>
      )}

      {/* FIXTURES TAB */}
      {activeTab==='fixtures'&&(
        <div className="fade-in">
          {matches.length===0?(
            <div className="card empty-state"><div className="empty-icon">📅</div><div className="empty-title">No fixtures generated yet</div><div className="empty-desc">Admin will generate the fixture after all teams are registered</div></div>
          ):(
            <>
              {liveMatches.length>0&&<div style={{marginBottom:28}}>
                <h3 style={{fontSize:'0.95rem',fontWeight:700,color:'var(--red)',marginBottom:12}}>● Live</h3>
                {liveMatches.map(m=><ScheduledMatchCard key={m._id} match={m} color="var(--red)"/>)}
              </div>}
              {[
                {title:'🥇 Winners Bracket',list:winnerMatches.filter(m=>m.status!=='live'),color:'#C8963E'},
                {title:'🔁 Losers Bracket',list:loserMatches.filter(m=>m.status!=='live'),color:'#2B4C8C'},
                {title:'🏆 Grand Final',list:finalMatches.filter(m=>m.status!=='live'),color:'#1B2A4A'},
              ].map(({title,list,color})=>list.length>0&&(
                <div key={title} style={{marginBottom:28}}>
                  <h3 style={{fontSize:'0.95rem',fontWeight:700,color,marginBottom:12}}>{title}</h3>
                  {list.map(m=><ScheduledMatchCard key={m._id} match={m} color={color}/>)}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* BRACKET TAB */}
      {activeTab==='bracket'&&(
        <div className="fade-in">
          {matches.length===0?(
            <div className="card empty-state"><div className="empty-icon">🏆</div><div className="empty-title">Bracket not generated yet</div></div>
          ):(
            <div className="card"><BracketView winnerMatches={winnerMatches} loserMatches={loserMatches} finalMatches={finalMatches}/></div>
          )}
        </div>
      )}

      {/* TEAMS TAB */}
      {activeTab==='teams'&&(
        <div className="fade-in">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>#</th><th>Team</th><th>Captain</th><th>Players</th><th>W</th><th>L</th><th>Bracket</th><th>Status</th></tr></thead>
              <tbody>
                {teams.length===0?<tr><td colSpan={8} style={{textAlign:'center',color:'var(--text-muted)',padding:40}}>No teams registered yet</td></tr>:
                  teams.map((t,i)=>(
                    <tr key={t._id}>
                      <td style={{color:'var(--text-muted)',fontWeight:600}}>{i+1}</td>
                      <td><strong style={{color:'var(--navy)'}}>{t.teamName}</strong>{t.seed>0&&<span style={{marginLeft:6,fontSize:'0.72rem',color:'var(--text-muted)'}}>Seed #{t.seed}</span>}</td>
                      <td style={{color:'var(--text-secondary)'}}>{t.captainName}</td>
                      <td>{t.players?.length||0}</td>
                      <td style={{color:'var(--green)',fontWeight:600}}>{t.wins||0}</td>
                      <td style={{color:'var(--red)',fontWeight:600}}>{t.losses||0}</td>
                      <td>
                        {t.bracket==='winners'&&<span className="badge badge-gold">WB</span>}
                        {t.bracket==='losers'&&<span className="badge badge-blue">LB</span>}
                        {t.bracket==='eliminated'&&<span className="badge badge-red">Eliminated</span>}
                        {t.bracket==='champion'&&<span className="badge badge-green">🏆 Champion</span>}
                        {(!t.bracket||t.bracket==='pending')&&<span className="badge badge-gray">—</span>}
                      </td>
                      <td><span className={`badge ${t.status==='approved'?'badge-green':t.status==='rejected'?'badge-red':'badge-gray'}`}>{t.status}</span></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REGISTRATION MODAL */}
      {showRegModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowRegModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">✍️ Register Your Team</h2>
              <button className="modal-close" onClick={()=>setShowRegModal(false)}>✕</button>
            </div>
            <p style={{color:'var(--text-secondary)',marginBottom:20,fontSize:'0.875rem'}}>Tournament: <strong style={{color:'var(--navy)'}}>{tournament.name}</strong></p>
            {regError&&<div className="alert alert-error">{regError}</div>}
            {regSuccess&&<div className="alert alert-success">{regSuccess}</div>}
            <form onSubmit={handleRegister}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Team Name *</label>
                  <input className="form-input" value={regForm.teamName} onChange={e=>setRegForm({...regForm,teamName:e.target.value})} placeholder="e.g., Royal Challengers" required/>
                </div>
                <div className="form-group">
                  <label className="form-label">Captain Name *</label>
                  <input className="form-input" value={regForm.captainName} onChange={e=>setRegForm({...regForm,captainName:e.target.value})} placeholder="Captain's full name" required/>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Captain Contact</label>
                  <input className="form-input" value={regForm.captainContact} onChange={e=>setRegForm({...regForm,captainContact:e.target.value})} placeholder="+91 98765 43210"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Captain Email</label>
                  <input className="form-input" type="email" value={regForm.captainEmail} onChange={e=>setRegForm({...regForm,captainEmail:e.target.value})} placeholder="captain@email.com"/>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Past Performance Points <span style={{color:'var(--text-muted)',textTransform:'none',fontWeight:400}}>— for seeding</span></label>
                <input className="form-input" type="number" min="0" value={regForm.points} onChange={e=>setRegForm({...regForm,points:parseInt(e.target.value)||0})} placeholder="0"/>
              </div>
              <div className="divider"/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <label className="form-label" style={{margin:0}}>Players <span style={{color:'var(--text-muted)',textTransform:'none',fontWeight:400}}>(optional)</span></label>
                <button type="button" className="btn btn-secondary btn-sm" onClick={()=>{if(regForm.players.length<tournament.playersPerTeam)setRegForm(f=>({...f,players:[...f.players,{name:'',role:''}]}))}}>+ Add Player</button>
              </div>
              {regForm.players.map((pl,i)=>(
                <div key={i} style={{display:'flex',gap:10,marginBottom:10,alignItems:'center'}}>
                  <input className="form-input" style={{flex:2}} placeholder={`Player ${i+1} name`} value={pl.name} onChange={e=>{const p=[...regForm.players];p[i].name=e.target.value;setRegForm({...regForm,players:p});}}/>
                  <select className="form-select" style={{flex:1}} value={pl.role} onChange={e=>{const p=[...regForm.players];p[i].role=e.target.value;setRegForm({...regForm,players:p});}}>
                    <option value="">Role</option>
                    {(isCricket?['Batsman','Bowler','All-Rounder','Wicketkeeper']:tournament.sport==='football'?['Goalkeeper','Defender','Midfielder','Forward']:['Player','Captain','Vice Captain']).map(r=><option key={r}>{r}</option>)}
                  </select>
                  <button type="button" className="btn btn-danger btn-sm" onClick={()=>setRegForm(f=>({...f,players:f.players.filter((_,j)=>j!==i)}))}>✕</button>
                </div>
              ))}
              <div style={{display:'flex',gap:10,marginTop:20}}>
                <button type="button" className="btn btn-secondary" style={{flex:1}} onClick={()=>setShowRegModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{flex:2}} disabled={regLoading}>{regLoading?'Submitting...':'✍️ Submit Registration'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentDetail;
