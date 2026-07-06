import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, animate } from 'framer-motion';
import { tournamentAPI } from '../utils/api';
import { formatLabel } from '../utils/formats';
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

// ── Animated counter ─────────────────────────────────────────────────
const Counter = ({ target, suffix = '' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const el = ref.current;
    const ctrl = animate(0, target, {
      duration: 1.6, ease: 'easeOut',
      onUpdate: (v) => { if (el) el.textContent = Math.floor(v) + suffix; }
    });
    return () => ctrl.stop();
  }, [inView, target, suffix]);
  return <span ref={ref}>0{suffix}</span>;
};

// ── Particle canvas background ────────────────────────────────────────
const ParticleField = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const N = 70;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200,150,62,0.5)';
        ctx.fill();
      });
      // draw lines between close points
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(200,150,62,${0.12 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none' }}/>;
};

// ── Word-by-word animated title ───────────────────────────────────────
const AnimTitle = ({ children, delay = 0 }) => {
  const words = children.split(' ');
  return (
    <span>
      {words.map((w, i) => (
        <motion.span key={i}
          initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: delay + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'inline-block', marginRight: '0.28em' }}
        >{w}</motion.span>
      ))}
    </span>
  );
};

// ── Rotating sport badge ticker ───────────────────────────────────────
const SportTicker = () => {
  const items = ['🏏 Cricket', '⚽ Football', '🏀 Basketball', '🏸 Badminton', '🎾 Tennis', '🏐 Volleyball'];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % items.length), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, height:30, overflow:'hidden', position:'relative' }}>
      <span style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.12em', fontWeight:600, flexShrink:0 }}>Sports:</span>
      <div style={{ position:'relative', overflow:'hidden', height:30, minWidth:130 }}>
        {items.map((item, i) => (
          <motion.div key={i}
            animate={{ y: i === idx ? 0 : i < idx ? -30 : 30, opacity: i === idx ? 1 : 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            style={{ position:'absolute', top:0, left:0, fontSize:'0.82rem', fontWeight:700, color:'#F5A623', whiteSpace:'nowrap', lineHeight:'30px' }}
          >{item}</motion.div>
        ))}
      </div>
    </div>
  );
};

// ── Format pill strip ─────────────────────────────────────────────────
const formats = [
  { icon:'🔄', label:'Double Knockout', color:'#C8963E' },
  { icon:'🥊', label:'KO cum League', color:'#4A90D9' },
  { icon:'🔁', label:'League cum KO', color:'#2B9348' },
  { icon:'⚡', label:'KO cum KO', color:'#9B5DE5' },
];

// ── Live score pulse card ─────────────────────────────────────────────
const LivePulse = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9, x: 30 }}
    animate={{ opacity: 1, scale: 1, x: 0 }}
    transition={{ delay: 1.1, duration: 0.5, ease: 'backOut' }}
    style={{
      background:'rgba(17,28,51,0.85)', backdropFilter:'blur(16px)',
      border:'1px solid rgba(200,150,62,0.25)', borderRadius:14,
      padding:'14px 18px', minWidth:200,
    }}
  >
    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
      <motion.div
        animate={{ opacity:[1,0.3,1] }} transition={{ duration:1, repeat:Infinity }}
        style={{ width:7, height:7, borderRadius:'50%', background:'#EF4444' }}
      />
      <span style={{ fontSize:'0.62rem', fontWeight:700, color:'#EF4444', letterSpacing:'0.15em', textTransform:'uppercase' }}>Live Matches</span>
    </div>
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {[['CSK','RCB','14-2'],['PU XI','DU XI','36-0']].map(([a,b,score],i)=>(
        <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'6px 10px' }}>
          <span style={{ fontSize:'0.75rem', fontWeight:700, color:'#fff' }}>{a}</span>
          <span style={{ fontSize:'0.65rem', color:'#F5A623', fontWeight:800, background:'rgba(200,150,62,0.12)', padding:'2px 7px', borderRadius:5 }}>{score}</span>
          <span style={{ fontSize:'0.75rem', fontWeight:700, color:'#fff' }}>{b}</span>
        </div>
      ))}
    </div>
  </motion.div>
);

// ── Trophy orbit visual ───────────────────────────────────────────────
const TrophyOrbit = () => (
  <div style={{ position:'relative', width:'100%', maxWidth:460, aspectRatio:'1', margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'center' }}>
    {/* outer ring */}
    <motion.div animate={{ rotate:360 }} transition={{ duration:36, repeat:Infinity, ease:'linear' }}
      style={{ position:'absolute', width:'100%', height:'100%' }}>
      <svg viewBox="0 0 300 300" style={{ width:'100%', height:'100%' }}>
        <circle cx="150" cy="150" r="135" stroke="rgba(200,150,62,0.18)" strokeWidth="1" strokeDasharray="6 5" fill="none"/>
        {[0,90,180,270].map((deg,i)=>{
          const rad = (deg * Math.PI) / 180;
          const cx = 150 + 135 * Math.cos(rad - Math.PI/2);
          const cy = 150 + 135 * Math.sin(rad - Math.PI/2);
          return (
            <motion.circle key={i} cx={cx} cy={cy} r="6"
              fill="#C8963E" animate={{ r:[5,8,5], opacity:[0.9,1,0.9] }}
              transition={{ duration:2, repeat:Infinity, delay:i*0.5 }}/>
          );
        })}
      </svg>
    </motion.div>
    {/* mid ring counter-rotate */}
    <motion.div animate={{ rotate:-360 }} transition={{ duration:22, repeat:Infinity, ease:'linear' }}
      style={{ position:'absolute', width:'65%', height:'65%' }}>
      <svg viewBox="0 0 300 300" style={{ width:'100%', height:'100%' }}>
        <circle cx="150" cy="150" r="130" stroke="rgba(43,76,140,0.3)" strokeWidth="1.5" strokeDasharray="3 8" fill="none"/>
        {[45,135,225,315].map((deg,i)=>{
          const rad = (deg * Math.PI) / 180;
          const cx = 150 + 130 * Math.cos(rad - Math.PI/2);
          const cy = 150 + 130 * Math.sin(rad - Math.PI/2);
          return <circle key={i} cx={cx} cy={cy} r="3.5" fill="#4A90D9" opacity="0.6"/>;
        })}
      </svg>
    </motion.div>
    {/* inner glow */}
    <div style={{ position:'absolute', width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle,rgba(200,150,62,0.22) 0%,transparent 70%)', filter:'blur(24px)' }}/>
    {/* center trophy */}
    <motion.div
      animate={{ y:[-6,6,-6] }} transition={{ duration:4, repeat:Infinity, ease:'easeInOut' }}
      style={{ position:'relative', zIndex:2, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}
    >
      <div style={{ fontSize:'5rem', filter:'drop-shadow(0 0 24px rgba(200,150,62,0.7)) drop-shadow(0 0 48px rgba(200,150,62,0.3))' }}>🏆</div>
      <div style={{ background:'rgba(200,150,62,0.12)', border:'1px solid rgba(200,150,62,0.35)', borderRadius:8, padding:'4px 14px', fontSize:'0.62rem', fontFamily:'monospace', letterSpacing:'0.18em', color:'#F5A623', textTransform:'uppercase' }}>PU · TMS · 2026</div>
    </motion.div>
    {/* floating format badges */}
    {[
      { label:'🔄 DKO', top:'6%', left:'-4%', delay:0.7 },
      { label:'🥊 KO+L', top:'6%', right:'-4%', delay:0.9 },
      { label:'🔁 L+KO', bottom:'12%', left:'-6%', delay:1.1 },
      { label:'⚡ KO+KO', bottom:'12%', right:'-6%', delay:1.3 },
    ].map((b,i)=>(
      <motion.div key={i}
        initial={{ opacity:0, scale:0.7 }} animate={{ opacity:1, scale:1 }}
        transition={{ delay:b.delay, duration:0.4, ease:'backOut' }}
        style={{ position:'absolute', top:b.top, bottom:b.bottom, left:b.left, right:b.right,
          background:'rgba(11,18,33,0.88)', border:'1px solid rgba(200,150,62,0.22)',
          borderRadius:9, padding:'5px 11px', fontSize:'0.66rem', color:'#CBD5E1',
          fontWeight:700, whiteSpace:'nowrap', backdropFilter:'blur(10px)' }}
      >{b.label}</motion.div>
    ))}
  </div>
);

// ── MAIN HERO ─────────────────────────────────────────────────────────
const HeroSection = ({ total, live, open }) => (
  <section style={{
    position:'relative', minHeight:'92vh', overflow:'hidden',
    background:'linear-gradient(135deg,#060B18 0%,#0D1730 40%,#111C33 100%)',
    display:'flex', alignItems:'center',
  }}>
    <ParticleField />
    {/* diagonal accent strip */}
    <div style={{ position:'absolute', top:0, right:0, width:'45%', height:'100%', background:'linear-gradient(135deg,transparent 0%,rgba(43,76,140,0.07) 100%)', pointerEvents:'none' }}/>
    {/* top gradient line */}
    <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,#C8963E,#2B4C8C,transparent)' }}/>

    <div className="page-container" style={{ position:'relative', zIndex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:56, alignItems:'center', padding:'80px 24px' }}>

      {/* LEFT */}
      <div>
        {/* eyebrow */}
        <motion.div
          initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
          style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 15px', borderRadius:999, background:'rgba(200,150,62,0.1)', border:'1px solid rgba(200,150,62,0.3)', fontSize:'0.65rem', fontFamily:'monospace', letterSpacing:'0.16em', color:'#F5A623', textTransform:'uppercase', marginBottom:22 }}
        >
          <motion.span animate={{ rotate:360 }} transition={{ duration:4, repeat:Infinity, ease:'linear' }}>⚙</motion.span>
          Panjab University Sports Department
        </motion.div>

        {/* title */}
        <h1 style={{ fontSize:'clamp(2.4rem,5.5vw,4rem)', fontWeight:900, lineHeight:1.05, letterSpacing:'-0.025em', marginBottom:20, color:'#fff' }}>
          <AnimTitle delay={0.05}>Official</AnimTitle>{' '}
          <span style={{ color:'#F5A623' }}>
            <AnimTitle delay={0.15}>Tournament</AnimTitle>
          </span><br/>
          <AnimTitle delay={0.28}>Management System</AnimTitle>
        </h1>

        {/* sport ticker */}
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.5 }}>
          <SportTicker />
        </motion.div>

        {/* desc */}
        <motion.p
          initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.55, duration:0.5 }}
          style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.95rem', lineHeight:1.8, maxWidth:480, margin:'16px 0 30px' }}
        >
          Centralized platform for inter-university sporting tournaments — automatic fixture generation, live scoring, group standings, and bracket management.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.65, duration:0.5 }}
          style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:36 }}
        >
          <Link to="/tournaments"
            style={{ padding:'13px 30px', background:'linear-gradient(135deg,#C8963E,#F5A623)', color:'#0F172A', fontWeight:800, fontSize:'0.75rem', letterSpacing:'0.1em', textTransform:'uppercase', borderRadius:12, textDecoration:'none', boxShadow:'0 8px 28px rgba(200,150,62,0.35)', display:'inline-flex', alignItems:'center', gap:8, transition:'transform 0.2s,box-shadow 0.2s' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 12px 36px rgba(200,150,62,0.5)';}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 8px 28px rgba(200,150,62,0.35)';}}
          >
            🏟 Browse Tournaments <span style={{ opacity:0.7 }}>→</span>
          </Link>
          <Link to="/register"
            style={{ padding:'13px 28px', background:'rgba(255,255,255,0.05)', color:'#fff', fontWeight:700, fontSize:'0.75rem', letterSpacing:'0.1em', textTransform:'uppercase', borderRadius:12, textDecoration:'none', border:'1px solid rgba(255,255,255,0.14)', transition:'border-color 0.2s,background 0.2s' }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(200,150,62,0.5)';e.currentTarget.style.background='rgba(200,150,62,0.08)';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.14)';e.currentTarget.style.background='rgba(255,255,255,0.05)';}}
          >
            ✍️ Register Team
          </Link>
        </motion.div>

        {/* stat bar */}
        <motion.div
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.85 }}
          style={{ display:'flex', gap:0, paddingTop:24, borderTop:'1px solid rgba(255,255,255,0.07)' }}
        >
          {[
            { val:total, suf:'', label:'Tournaments' },
            { val:live,  suf:'', label:'Live Now'    },
            { val:open,  suf:'', label:'Open Reg.'   },
            { val:4,     suf:'', label:'Formats'     },
          ].map((s,i)=>(
            <div key={i} style={{ flex:1, textAlign:'center', borderRight: i<3 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
              <div style={{ fontSize:'1.8rem', fontWeight:900, color:'#F5A623', lineHeight:1 }}>
                <Counter target={s.val} suffix={s.suf}/>
              </div>
              <div style={{ fontSize:'0.64rem', color:'rgba(255,255,255,0.35)', marginTop:5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em' }}>{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* RIGHT */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:24 }}>
        <TrophyOrbit/>
        <LivePulse/>
      </div>
    </div>

    {/* format pill strip at bottom */}
    <motion.div
      initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:1.3, duration:0.5 }}
      style={{ position:'absolute', bottom:0, left:0, right:0, borderTop:'1px solid rgba(255,255,255,0.05)', background:'rgba(6,11,24,0.7)', backdropFilter:'blur(12px)', padding:'12px 24px', display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap' }}
    >
      <span style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.12em', alignSelf:'center', fontWeight:600 }}>Supported Formats:</span>
      {formats.map((f,i)=>(
        <motion.div key={i}
          whileHover={{ y:-2, scale:1.04 }}
          style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.04)', border:`1px solid ${f.color}30`, borderRadius:8, padding:'5px 12px', fontSize:'0.72rem', color:'rgba(255,255,255,0.7)', fontWeight:600, cursor:'default' }}
        >
          <span>{f.icon}</span> {f.label}
        </motion.div>
      ))}
    </motion.div>
  </section>
);

// ── Main component ────────────────────────────────────────────────────
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
      <HeroSection total={tournaments.length} live={liveCount} open={openCount}/>

      {/* Info banner */}
      <div className="info-banner">
        <div className="page-container">
          <div className="info-banner-inner">
            <div className="info-item">🌐 <span>Public access — no login required to view fixtures &amp; scores</span></div>
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
              <p className="user-type-desc">Full control — create tournaments, approve teams, generate fixtures for any format, and update live match scores.</p>
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
              <div className="section-label">Live &amp; Upcoming</div>
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
                    <span className="t-format-tag">{formatLabel(t.format)}</span>
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
              {n:'01', icon:'📋', title:'Admin Creates Tournament', desc:'Sets sport, max teams, players, venue, dates, format and opens registration.'},
              {n:'02', icon:'✍️', title:'Teams Register', desc:'Users register their team with captain & player details. Admin reviews and approves.'},
              {n:'03', icon:'⚡', title:'Fixture Generated', desc:'Admin generates bracket with automatic seeding and bye assignment for any format.'},
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

      {/* Tournament Formats */}
      <section className="section section-alt">
        <div className="page-container">
          <div className="dko-grid">
            <div>
              <div className="section-label">Tournament Formats</div>
              <h2 className="section-title">Built for Every Format</h2>
              <p className="section-subtitle" style={{marginBottom:16}}>From knockout battles to league rivalries</p>
              <p style={{color:'var(--text-secondary)',lineHeight:1.8,fontSize:'0.9rem'}}>
                PU TMS supports multiple tournament formats — from the classic Double Knockout to combination formats used in PU sports events. Every format uses automatic seeding, bye assignment, and live scoring.
              </p>
              <ul className="dko-features">
                <li className="dko-feature"><span className="dko-feature-icon">🔄</span><span><strong>Double Knockout</strong> — Two losses to eliminate; WB + LB + Grand Final</span></li>
                <li className="dko-feature"><span className="dko-feature-icon">🥊</span><span><strong>Knockout cum League</strong> — Knockout whittles teams down, then a round-robin decides the champion</span></li>
                <li className="dko-feature"><span className="dko-feature-icon">🔁</span><span><strong>League cum Knockout</strong> — Group-wise league stages; group winners advance to a knockout final</span></li>
                <li className="dko-feature"><span className="dko-feature-icon">⚡</span><span><strong>Knockout cum Knockout</strong> — Group knockouts feed into a final knockout stage</span></li>
                <li className="dko-feature"><span className="dko-feature-icon">🎰</span><span><strong>Seeding &amp; Byes</strong> automatically assigned based on past performance points</span></li>
                <li className="dko-feature"><span className="dko-feature-icon">📊</span><span><strong>Points Table &amp; NRR</strong> auto-calculated after every match result</span></li>
              </ul>
            </div>
            <div className="dko-diagram">
              <div className="dko-diagram-title">Supported Formats</div>
              <div className="bracket-vis">
                <div className="bracket-row"><div className="bracket-box wb">🔄 Double Knockout</div></div>
                <div className="bracket-row" style={{marginTop:8}}><div className="bracket-box lb">🥊 Knockout cum League</div></div>
                <div className="bracket-row" style={{marginTop:8}}><div className="bracket-box lb">🔁 League cum Knockout</div></div>
                <div className="bracket-row" style={{marginTop:8}}><div className="bracket-box lb">⚡ Knockout cum Knockout</div></div>
                <div style={{display:'flex',justifyContent:'center',marginTop:12}}><div className="bracket-arr" style={{fontSize:'1.2rem'}}>↓</div></div>
                <div className="bracket-box gf">🏆 Champion</div>
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
