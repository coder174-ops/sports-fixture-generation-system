import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };
  const isActive = (path) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <nav className="navbar">
      <div className="navbar-top-bar">
        <div className="navbar-top-inner">
          <span>🏛️ Panjab University Sports Department</span>
          <span>Official Tournament Management System</span>
        </div>
      </div>
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <div className="brand-logo">🏆</div>
          <div className="brand-text-wrap">
            <span className="brand-name">PU TMS</span>
            <span className="brand-sub">Sports Portal</span>
          </div>
        </Link>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/" className={`nav-link ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}>Home</Link>
          <Link to="/tournaments" className={`nav-link ${isActive('/tournaments') ? 'active' : ''}`}>Tournaments</Link>
          {user && <Link to="/my-teams" className={`nav-link ${isActive('/my-teams') ? 'active' : ''}`}>My Teams</Link>}
          {isAdmin && <Link to="/admin" className={`nav-link admin-link ${isActive('/admin') ? 'active' : ''}`}>⚙ Admin</Link>}
        </div>

        <div className="navbar-auth">
          {user ? (
            <div className="user-menu">
              <div className="user-info">
                <div className="user-avatar">{user.username?.charAt(0).toUpperCase()}</div>
                <span className="user-name">{user.username}</span>
                {isAdmin && <span className="badge badge-gold" style={{fontSize:'0.6rem'}}>ADMIN</span>}
              </div>
              <button onClick={handleLogout} className="btn-nav-logout">Logout</button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn-nav-login">Login</Link>
              <Link to="/register" className="btn-nav-register">Register</Link>
            </div>
          )}
        </div>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
