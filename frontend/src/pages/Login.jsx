import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, ShieldCheck, AlertCircle, ArrowRight, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { APP_CONFIG } from '../config/appConfig';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const success = await login(username, password);
    setIsLoading(false);
    
    if (success) {
      navigate('/admin');
    } else {
      setError('Invalid administrator credentials');
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      width: '100%', 
      background: 'var(--bg-primary)',
      position: 'relative',
      overflow: 'hidden',
      padding: '20px'
    }}>
      
      {/* Animated Background Orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: 'absolute', top: '15%', left: '15%', width: '40vw', height: '40vw', maxWidth: '400px', maxHeight: '400px', background: 'rgba(30, 64, 175, 0.1)', filter: 'blur(80px)', borderRadius: '50%' }}
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        style={{ position: 'absolute', bottom: '10%', right: '15%', width: '35vw', height: '35vw', maxWidth: '350px', maxHeight: '350px', background: 'rgba(59, 130, 246, 0.15)', filter: 'blur(80px)', borderRadius: '50%' }}
      />

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="glass" 
        style={{ 
          width: '100%', 
          maxWidth: '440px', 
          padding: '48px 40px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px'
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary), #60a5fa)' }}></div>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 150, damping: 15 }}
            style={{ 
              display: 'inline-flex', 
              padding: '18px', 
              borderRadius: '24px', 
              background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.1), rgba(59, 130, 246, 0.05))', 
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 15px rgba(0,0,0,0.05)',
              marginBottom: '24px',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}
          >
            <Activity size={40} className="gradient-text" style={{ filter: 'drop-shadow(0 2px 4px rgba(59,130,246,0.3))' }} />
          </motion.div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: '8px', color: 'var(--text-primary)' }}>
            {APP_CONFIG.APP_NAME} <span className="gradient-text">{APP_CONFIG.APP_SUFFIX}</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: '500' }}>{APP_CONFIG.LOGIN_SUBTITLE}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '4px' }}>{APP_CONFIG.LOGIN_USERNAME_LABEL}</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Enter your ID" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="input-premium"
                style={{ background: 'rgba(255, 255, 255, 0.9)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '4px' }}>{APP_CONFIG.LOGIN_PASSWORD_LABEL}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-premium"
                style={{ background: 'rgba(255, 255, 255, 0.9)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                color: 'var(--accent-danger)', 
                fontSize: '0.85rem', 
                fontWeight: '500',
                background: 'rgba(239, 68, 68, 0.1)', 
                padding: '12px 16px', 
                borderRadius: '12px', 
                border: '1px solid rgba(239, 68, 68, 0.2)' 
              }}
            >
              <AlertCircle size={18} />
              {error}
            </motion.div>
          )}

          <motion.button 
            whileHover={{ scale: 1.02, boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)' }}
            whileTap={{ scale: 0.98 }}
            type="submit" 
            className="btn btn-primary" 
            disabled={isLoading}
            style={{ 
              width: '100%', 
              justifyContent: 'center', 
              padding: '16px', 
              marginTop: '12px',
              fontSize: '1rem',
              fontWeight: '600',
              letterSpacing: '0.02em',
              borderRadius: '14px',
              opacity: isLoading ? 0.7 : 1,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {isLoading ? 'Authenticating...' : APP_CONFIG.LOGIN_BUTTON_TEXT}
            {!isLoading && <ArrowRight size={18} style={{ marginLeft: '6px' }} />}
          </motion.button>
        </form>

        <div style={{ marginTop: '32px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
          <ShieldCheck size={14} />
          <span>{APP_CONFIG.LOGIN_SECURITY_BADGE}</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;

