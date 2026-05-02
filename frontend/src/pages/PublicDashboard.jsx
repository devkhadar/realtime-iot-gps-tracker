import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Tooltip } from 'react-leaflet';
import { useSocket } from '../context/SocketContext';
import { geofenceService } from '../services/geofenceService';
import { Building2, Truck, Activity, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import 'leaflet/dist/leaflet.css';
import { APP_CONFIG } from '../config/appConfig';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const MAPBOX_STYLE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const PublicDashboard = () => {
  const { vehicles, events, isConnected } = useSocket();
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await geofenceService.getAll();
        setGeofences(data);
      } catch (err) {
        console.error('Error fetching geofences:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Group vehicles by their current geofence
  const vehiclesInBuildings = geofences.reduce((acc, gf) => {
    acc[gf.name] = Object.values(vehicles).filter(v => v.currentGeofence === gf.name);
    return acc;
  }, {});

  const vehiclesOutside = Object.values(vehicles).filter(v => !v.currentGeofence);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.5 }}
      className="dashboard-wrapper"
    >
      {/* Header & Connection Status */}
      <div className="header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontWeight: '800', letterSpacing: '-0.04em', color: 'var(--text-primary)', marginBottom: '4px' }}>{APP_CONFIG.PUBLIC_TITLE}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '4px', background: 'var(--accent-primary)', borderRadius: '2px' }}></div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: '500' }}>{APP_CONFIG.PUBLIC_SUBTITLE}</p>
          </div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="badge-container"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '10px 20px', 
            background: isConnected ? 'rgba(5, 150, 105, 0.08)' : 'rgba(220, 38, 38, 0.08)', 
            borderRadius: '14px',
            border: `1px solid ${isConnected ? 'rgba(5, 150, 105, 0.15)' : 'rgba(220, 38, 38, 0.15)'}`,
            backdropFilter: 'blur(8px)'
          }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ 
              width: '10px', 
              height: '10px', 
              borderRadius: '50%', 
              background: isConnected ? 'var(--accent-success)' : 'var(--accent-danger)',
              boxShadow: `0 0 15px ${isConnected ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
            }}></div>
            {isConnected && (
              <motion.div 
                animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ 
                  position: 'absolute',
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  border: '2px solid var(--accent-success)',
                }}
              />
            )}
          </div>
          <span style={{ 
            fontSize: '0.85rem', 
            fontWeight: '800', 
            color: isConnected ? 'var(--accent-success)' : 'var(--accent-danger)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase'
          }}>
            {isConnected ? 'Live Sync' : 'Offline'}
          </span>
          {isConnected ? <Wifi size={18} color="var(--accent-success)" /> : <WifiOff size={18} color="var(--accent-danger)" />}
        </motion.div>
      </div>
      {/* Top Header: Stats Overview */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass" 
          style={{ 
            padding: '28px', 
            background: 'white', 
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ padding: '14px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '14px' }}>
              <Truck size={28} className="gradient-text" />
            </div>
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>{APP_CONFIG.PUBLIC_STATS_OUTSIDE}</span>
              <span style={{ fontSize: '2.4rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{vehiclesOutside.length}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ padding: '6px 12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '20px', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: '700' }}>LIVE FLEET</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass" 
          style={{ 
            padding: '28px', 
            background: 'white', 
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ padding: '14px', background: 'rgba(5, 150, 105, 0.1)', borderRadius: '14px' }}>
              <Building2 size={28} style={{ color: 'var(--accent-success)' }} />
            </div>
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>{APP_CONFIG.PUBLIC_STATS_INSIDE}</span>
              <span style={{ fontSize: '2.4rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {geofences.filter(gf => (vehiclesInBuildings[gf.name] || []).length > 0).length} / {geofences.length}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ padding: '6px 12px', background: 'rgba(5, 150, 105, 0.1)', borderRadius: '20px', color: 'var(--accent-success)', fontSize: '0.75rem', fontWeight: '700' }}>SITE STATUS</div>
          </div>
        </motion.div>
      </div>

        {/* Building Occupancy Summary */}
        <div className="glass" style={{ border: '1px solid var(--border-color)', background: 'rgba(255, 255, 255, 0.7)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <div style={{ padding: '10px', background: '#f1f5f9', borderRadius: '12px' }}>
              <Activity className="gradient-text" size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em' }}>{APP_CONFIG.PUBLIC_STATIONS_TITLE}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{APP_CONFIG.PUBLIC_STATIONS_SUBTITLE}</p>
            </div>
          </div>

          <div className="building-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            <AnimatePresence>
              {geofences.map(gf => {
                const occupants = vehiclesInBuildings[gf.name] || [];
                const isActive = occupants.length > 0;
                
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={gf.id}
                    className="glass"
                    style={{ 
                      padding: '24px', 
                      background: 'white', 
                      border: '1px solid var(--border-color)',
                      borderTop: `4px solid ${isActive ? 'var(--accent-success)' : '#e2e8f0'}`,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {isActive && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '12px', 
                        right: '12px', 
                        width: '8px', 
                        height: '8px', 
                        background: 'var(--accent-success)', 
                        borderRadius: '50%',
                        boxShadow: '0 0 0 4px rgba(5, 150, 105, 0.2)',
                        animation: 'pulse 2s infinite'
                      }}></div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                      <div style={{ padding: '8px', background: isActive ? 'rgba(5, 150, 105, 0.1)' : '#f1f5f9', borderRadius: '8px', color: isActive ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
                        <Building2 size={20} />
                      </div>
                      <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{gf.name}</div>
                    </div>

                    <div 
                      className="custom-scrollbar"
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '12px', 
                        maxHeight: '320px', 
                        overflowY: 'auto', 
                        paddingRight: '6px',
                        minHeight: '120px' // Prevent collapse
                      }}
                    >
                      {isActive ? (
                        occupants.slice(0, 20).map(v => ( // Lazy load: Show first 20 for performance
                          <motion.div 
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            key={v.deviceId}
                            style={{ 
                              padding: '12px', 
                              background: '#f8fafc', 
                              borderRadius: '10px', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              border: '1px solid #edf2f7'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: 'var(--accent-primary)' }}>
                                <Truck size={16} />
                              </div>
                              <div>
                                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)', display: 'block' }}>{v.deviceId}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4' }}>
                                  <Activity size={10} /> {v.speed > 0 ? 'Active' : 'Parked'}
                                </span>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                                {v.arrivalTime ? v.arrivalTime : '--:--'}
                              </div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Arrival</div>
                              {v.estimatedDeparture && (
                                <>
                                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--accent-secondary)' }}>
                                    {v.estimatedDeparture}
                                  </div>
                                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Est. Departure</div>
                                </>
                              )}
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #e2e8f0', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <AlertCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                          {APP_CONFIG.PUBLIC_NO_ASSETS}
                        </div>
                      )}
                      {occupants.length > 20 && (
                        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '8px' }}>
                          + {occupants.length - 20} more vehicles...
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status:</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: isActive ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
                        {isActive ? 'OCCUPIED' : 'VACANT'}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
  </motion.div>
  );
};

export default PublicDashboard;
