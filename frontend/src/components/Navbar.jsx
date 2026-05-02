import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, LayoutDashboard, Settings, LogOut, Map, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_CONFIG } from '../config/appConfig';
import logo from '../assets/logo.png';

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    navigate('/');
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <>
      <motion.nav 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="glass nav-container" 
        style={{ 
          margin: '16px 24px', 
          padding: '16px 28px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'white',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
          zIndex: 1001,
          position: 'relative'
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ padding: '4px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={logo} alt="Vanguard Logo" style={{ width: '28px', height: '28px', borderRadius: '8px' }} />
          </div>
          <div className="nav-brand-text">
            <h1 style={{ fontSize: '1.3rem', fontWeight: '700', letterSpacing: '0.02em', margin: 0 }} className="gradient-text">{APP_CONFIG.APP_NAME}</h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '0.1em', margin: 0, marginTop: '2px' }}>{APP_CONFIG.LOGIN_SUBTITLE.toUpperCase()}</p>
          </div>
        </Link>

        {/* Desktop Menu */}
        <div className="nav-desktop">
          <Link to="/" className={`btn ${location.pathname === '/' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '10px 18px' }}>
            <LayoutDashboard size={18} />
            Global View
          </Link>
          
          {isAuthenticated ? (
            <>
              <Link to="/admin" className={`btn ${location.pathname === '/admin' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '10px 18px' }}>
                <Map size={18} />
                Command Center
              </Link>
              <motion.button 
                whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                onClick={handleLogout} 
                className="btn btn-ghost" 
                style={{ color: 'var(--accent-danger)', padding: '10px 18px' }}
              >
                <LogOut size={18} />
                Disconnect
              </motion.button>
            </>
          ) : (
            <Link to="/login" className="btn btn-ghost" style={{ padding: '10px 18px' }}>
              <Settings size={18} />
              Admin Access
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <div style={{ display: 'none' }} className="nav-mobile-toggle">
          <button onClick={toggleMenu} className="btn btn-ghost" style={{ padding: '8px' }}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="mobile-menu-overlay"
            style={{ padding: '0' }}
          >
            {/* Mobile Menu Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '4px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={logo} alt="Vanguard Logo" style={{ width: '24px', height: '24px', borderRadius: '6px' }} />
                </div>
                <span style={{ fontWeight: '800', fontSize: '1.1rem' }} className="gradient-text">{APP_CONFIG.APP_NAME}</span>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="btn btn-ghost" style={{ padding: '8px', borderRadius: '50%' }}>
                <X size={24} />
              </button>
            </div>

            {/* Mobile Menu Content */}
            <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link to="/" onClick={() => setIsMenuOpen(false)} className={`btn ${location.pathname === '/' ? 'btn-primary' : 'btn-ghost'}`} style={{ width: '100%', padding: '16px', justifyContent: 'flex-start' }}>
                <LayoutDashboard size={20} />
                Global View
              </Link>
              
              {isAuthenticated ? (
                <>
                  <Link to="/admin" onClick={() => setIsMenuOpen(false)} className={`btn ${location.pathname === '/admin' ? 'btn-primary' : 'btn-ghost'}`} style={{ width: '100%', padding: '16px', justifyContent: 'flex-start' }}>
                    <Map size={20} />
                    Command Center
                  </Link>
                  <button 
                    onClick={handleLogout} 
                    className="btn btn-ghost" 
                    style={{ width: '100%', padding: '16px', color: 'var(--accent-danger)', border: '1px solid rgba(239, 68, 68, 0.1)', justifyContent: 'flex-start' }}
                  >
                    <LogOut size={20} />
                    Disconnect Terminal
                  </button>
                </>
              ) : (
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="btn btn-ghost" style={{ width: '100%', padding: '16px', border: '1px solid var(--border-color)', justifyContent: 'flex-start' }}>
                  <Settings size={20} />
                  Admin Access
                </Link>
              )}
            </div>

            {/* Mobile Menu Footer */}
            <div style={{ marginTop: 'auto', padding: '32px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>{APP_CONFIG.APP_NAME} v1.0.4</p>
              <div style={{ width: '20px', height: '2px', background: 'var(--border-color)', margin: '12px auto' }}></div>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.6 }}>© 2026 {APP_CONFIG.LOGIN_SUBTITLE.toUpperCase()}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
