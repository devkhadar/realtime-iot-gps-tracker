import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from 'react-leaflet';
import { geofenceService } from '../services/geofenceService';
import { settingsService } from '../services/settingsService';
import { 
  Building, 
  Trash2, 
  Search, 
  Plus, 
  Activity, 
  Truck, 
  LogOut,
  Settings,
  Clock,
  ShieldCheck,
  Calendar,
  Save,
  X,
  Navigation,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { useMap, Tooltip } from 'react-leaflet';
import { APP_CONFIG } from '../config/appConfig';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const MAPBOX_STYLE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const [geofences, setGeofences] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newGfName, setNewGfName] = useState('');
  const [tempLatlngs, setTempLatlngs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(null);
  const [editingGfId, setEditingGfId] = useState(null);
  const [gfToDelete, setGfToDelete] = useState(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settings, setSettings] = useState({
    checkDutyFlag: false,
    parserStartsAt: '08:00',
    parserEndsAt: '20:00',
    dutyDays: 'Monday,Tuesday,Wednesday,Thursday,Friday'
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const polygonRefs = React.useRef({});

  useEffect(() => {
    fetchGeofences();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to fetch settings');
    }
  };

  const handleUpdateSettings = async (e) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    try {
      await settingsService.updateSettings(settings);
      setIsSettingsModalOpen(false);
    } catch (err) {
      alert('Failed to update settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const fetchGeofences = async () => {
    try {
      const data = await geofenceService.getAll();
      setGeofences(data);
    } catch (err) {
      console.error('Error fetching geofences:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteGeofence = async (id) => {
    try {
      await geofenceService.delete(id);
      setGeofences(geofences.filter(g => g.id !== id));
      setGfToDelete(null);
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleSaveGeofence = async () => {
    if (!newGfName || !tempLatlngs) {
      alert('Please enter a name and draw a polygon on the map.');
      return;
    }

    try {
      await geofenceService.create(newGfName, tempLatlngs);
      setIsDrawing(false);
      setEditingGfId(null);
      setTempLatlngs(null);
      setNewGfName('');
      fetchGeofences();
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
  };

  const startEditing = (gf) => {
    setEditingGfId(gf.id);
    setNewGfName(gf.name);
    setIsDrawing(true);
    
    const layer = polygonRefs.current[gf.id];
    if (layer) {
      layer.pm.enable({
        allowSelfIntersection: false,
      });
      
      layer.on('pm:edit', (e) => {
        const latlngs = e.target.getLatLngs()[0].map(ll => ({
          latitude: ll.lat,
          longitude: ll.lng
        }));
        setTempLatlngs(latlngs);
      });
    }
  };

  const cancelEdit = () => {
    if (editingGfId) {
      const layer = polygonRefs.current[editingGfId];
      if (layer) {
        layer.pm.disable();
      }
    }
    setIsDrawing(false);
    setEditingGfId(null);
    setTempLatlngs(null);
    setNewGfName('');
    fetchGeofences(); // Sync state
  };

  const GeomanControl = () => {
    const map = useMap();
    window.leafletMap = map; // Expose for programmatic access

    useEffect(() => {
      if (!map) return;

      map.pm.addControls({
        position: 'topleft',
        drawCircle: false,
        drawMarker: false,
        drawCircleMarker: false,
        drawPolyline: false,
        drawRectangle: true,
        drawPolygon: true,
        editMode: true,
        dragMode: true,
        cutPolygon: false,
        removalMode: true,
      });

      map.pm.setGlobalOptions({ 
        pathOptions: { 
          color: 'var(--accent-primary)',
          fillColor: 'var(--accent-primary)',
          fillOpacity: 0.2 
        } 
      });

      map.on('pm:create', (e) => {
        const { layer } = e;
        const latlngs = layer.getLatLngs()[0].map(ll => ({
          latitude: ll.lat,
          longitude: ll.lng
        }));
        
        setTempLatlngs(latlngs);
        setIsDrawing(true);
        
        // Clear temp layer; React state will redraw on save
        layer.remove();
      });

      return () => {
        map.pm.removeControls();
        map.off('pm:create');
      };
    }, [map]);

    return null;
  };

  const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const toggleDay = (day) => {
    let currentDays = settings.dutyDays ? settings.dutyDays.split(',').map(d => d.trim()) : [];
    if (currentDays.includes(day)) {
      currentDays = currentDays.filter(d => d !== day);
    } else {
      currentDays.push(day);
    }
    setSettings({ ...settings, dutyDays: currentDays.join(',') });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.5 }}
      className="dashboard-grid"
    >
      <AnimatePresence>
        {gfToDelete && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass modal-content"
              style={{ textAlign: 'center' }}
            >
              <div style={{ width: '64px', height: '64px', background: '#fef2f2', color: 'var(--accent-danger)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Trash2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>Confirm Deletion</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '32px' }}>
                Are you sure you want to remove <strong style={{ color: 'var(--text-primary)' }}>{gfToDelete.name}</strong>? This action will permanently disable live tracking for this perimeter.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setGfToDelete(null)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button onClick={() => deleteGeofence(gfToDelete.id)} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'var(--accent-danger)', boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)' }}>Delete Now</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass modal-content"
            >
              <button 
                onClick={() => setIsSettingsModalOpen(false)}
                style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={24} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '10px', color: 'var(--accent-primary)' }}>
                  <Settings size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>{APP_CONFIG.ADMIN_CONTROLS_TITLE}</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {settings.isMockMode && (
                  <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: 'var(--accent-danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} />
                    <strong>Mock Mode Active:</strong> Duty Enforcement is automatically bypassed so simulator data can be visualized.
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', opacity: settings.isMockMode ? 0.6 : 1 }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Enforce Duty Hours</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>If disabled, tracks 24/7.</p>
                  </div>
                  <button 
                    onClick={() => {
                      if (!settings.isMockMode) setSettings({ ...settings, checkDutyFlag: !settings.checkDutyFlag });
                    }}
                    disabled={settings.isMockMode}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '24px',
                      background: settings.checkDutyFlag ? 'var(--accent-success)' : '#cbd5e1',
                      border: 'none',
                      position: 'relative',
                      cursor: settings.isMockMode ? 'not-allowed' : 'pointer',
                      transition: '0.3s'
                    }}
                  >
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'white',
                      position: 'absolute',
                      top: '3px',
                      left: settings.checkDutyFlag ? '23px' : '3px',
                      transition: '0.3s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>START TIME</label>
                    <input 
                      type="time" 
                      value={settings.parserStartsAt}
                      onChange={(e) => setSettings({ ...settings, parserStartsAt: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.95rem', fontWeight: '600', outline: 'none' }}
                      disabled={!settings.checkDutyFlag}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>END TIME</label>
                    <input 
                      type="time" 
                      value={settings.parserEndsAt}
                      onChange={(e) => setSettings({ ...settings, parserEndsAt: e.target.value })}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.95rem', fontWeight: '600', outline: 'none' }}
                      disabled={!settings.checkDutyFlag}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Calendar size={14} /> ACTIVE DAYS
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {DAYS_OF_WEEK.map(day => {
                      const isActive = (settings.dutyDays || '').includes(day);
                      return (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          disabled={!settings.checkDutyFlag}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                            background: isActive ? 'var(--accent-primary)' : 'white',
                            color: isActive ? 'white' : 'var(--text-secondary)',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            cursor: settings.checkDutyFlag ? 'pointer' : 'not-allowed',
                            opacity: settings.checkDutyFlag ? 1 : 0.5,
                            transition: 'all 0.2s'
                          }}
                        >
                          {day.substring(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button 
                  onClick={handleUpdateSettings} 
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', justifyContent: 'center', marginTop: '8px' }}
                  disabled={isSavingSettings}
                >
                  {isSavingSettings ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="map-container" style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)' }}>
          <MapContainer center={[17.44, 78.38]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url={MAPBOX_STYLE_URL}
              attribution={MAPBOX_TOKEN
                ? '&copy; <a href="https://www.mapbox.com/">Mapbox</a>'
                : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
            />
            <GeomanControl />
            
            {geofences.map(gf => {
              const isEditing = editingGfId === gf.id;
              const positions = (isEditing && tempLatlngs) 
                ? tempLatlngs.map(l => [l.latitude, l.longitude])
                : gf.latlngs.map(l => [l.latitude, l.longitude]);

              return (
                <Polygon 
                  key={gf.id}
                  ref={el => polygonRefs.current[gf.id] = el}
                  positions={positions}
                  pathOptions={{ 
                    color: isEditing ? 'var(--accent-success)' : 'var(--accent-primary)', 
                    fillOpacity: isEditing ? 0.4 : 0.2,
                    dashArray: isEditing ? '5, 10' : 'none'
                  }}
                >
                  <Tooltip permanent direction="center" className="gf-tooltip">
                    {gf.name}
                  </Tooltip>
                </Polygon>
              );
            })}
          </MapContainer>

          {isDrawing && (
            <div className="glass" style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', zIndex: 1000, padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="Building Name (e.g. Block A)" 
                value={newGfName}
                onChange={e => setNewGfName(e.target.value)}
                style={{ flex: 1, padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
              />
              <button onClick={handleSaveGeofence} className="btn btn-primary">
                <Save size={18} />
                Save {editingGfId ? 'Changes' : 'Perimeter'}
              </button>
              <button onClick={cancelEdit} className="btn btn-ghost" style={{ color: 'var(--accent-danger)' }}>
                <X size={18} />
                Cancel
              </button>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {editingGfId ? 'Drag handles on map to modify vertices.' : 'Perimeter captured. Enter name and save.'}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="glass" style={{ padding: '32px', flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }}>
            <div style={{ flex: '1 1 min-content' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px', margin: '0 0 4px 0' }}>
                <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px' }}>
                  <Building className="gradient-text" size={22} />
                </div>
                {APP_CONFIG.ADMIN_INVENTORY_TITLE}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, paddingLeft: '42px' }}>
                {geofences.length} active perimeters
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {!isDrawing && (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (window.leafletMap) {
                      window.leafletMap.pm.enableDraw('Polygon');
                    }
                  }} 
                  className="btn btn-primary"
                  style={{ padding: '10px 16px' }}
                >
                  <Plus size={18} />
                  Draw New
                </motion.button>
              )}
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSettingsModalOpen(true)}
                className="btn btn-ghost"
                style={{ padding: '10px', background: '#f8fafc', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                title={APP_CONFIG.ADMIN_CONTROLS_TITLE}
              >
                <Settings size={20} />
              </motion.button>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ position: 'relative' }}>
              <Edit2 size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Search perimeters..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px 12px 12px 40px', 
                  background: '#f1f5f9', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid rgba(59, 130, 246, 0.3)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              </div>
            ) : geofences.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '60px 20px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
                <Building size={48} style={{ opacity: 0.3, marginBottom: '16px', margin: '0 auto' }} />
                <p style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '8px' }}>{APP_CONFIG.ADMIN_NO_PERIMETERS}</p>
                <p style={{ fontSize: '0.9rem' }}>{APP_CONFIG.ADMIN_NO_PERIMETERS_SUBTEXT}</p>
              </div>
            ) : (
              <AnimatePresence>
                {geofences
                  .filter(gf => gf.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(gf => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={gf.id} 
                    className="glass" 
                    style={{ 
                      padding: '16px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      background: 'white',
                      transition: 'all 0.3s ease',
                      border: '1px solid var(--border-color)',
                      marginBottom: '12px'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
                  >
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '10px', color: 'var(--accent-primary)' }}>
                        <Building size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text-primary)' }}>{gf.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Navigation size={10} /> {gf.latlngs.length} Nodes</span>
                          <span>•</span>
                          <span style={{ color: 'var(--accent-primary)', fontWeight: '500' }}>Active</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <motion.button 
                        whileHover={{ scale: 1.1, backgroundColor: '#eff6ff' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => startEditing(gf)} 
                        className="btn btn-ghost" 
                        style={{ padding: '8px', color: 'var(--accent-primary)', border: 'none' }}
                        title="Edit Perimeter"
                        disabled={isDrawing}
                      >
                        <Edit2 size={16} />
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.1, backgroundColor: '#fef2f2' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setGfToDelete(gf)} 
                        className="btn btn-ghost" 
                        style={{ padding: '8px', color: 'var(--accent-danger)', border: 'none' }}
                        title="Delete Perimeter"
                        disabled={isDrawing}
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className="glass" style={{ padding: '24px', background: 'rgba(59, 130, 246, 0.05)', borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-primary)', marginBottom: '12px' }}>
            <Navigation size={20} />
            <span style={{ fontWeight: '600', fontSize: '1rem' }}>{APP_CONFIG.ADMIN_DRAWING_GUIDE}</span>
          </div>
          <ol style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>Use the <strong>Polygon</strong> or <strong>Rectangle</strong> tools in the top-left toolbar.</li>
            <li>Draw your perimeter directly on the map.</li>
            <li>Once finished, a save dialog will appear automatically.</li>
            <li>Name your sector and save to activate live tracking.</li>
          </ol>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminDashboard;
