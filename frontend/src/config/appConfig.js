/**
 * Centralized Application Configuration
 * Modify these strings to rebrand the application without diving into the React components.
 */
export const APP_CONFIG = {
  // Common
  APP_NAME: "Vanguard",
  APP_SUFFIX: "Telemetry",
  
  // Login Page
  LOGIN_SUBTITLE: "Enterprise Fleet Operations",
  LOGIN_USERNAME_LABEL: "Administrator ID",
  LOGIN_PASSWORD_LABEL: "Access Protocol",
  LOGIN_BUTTON_TEXT: "Establish Secure Connection",
  LOGIN_SECURITY_BADGE: "Encrypted via AES-256 Transport",

  // Public Dashboard
  PUBLIC_TITLE: "Fleet Telemetry",
  PUBLIC_SUBTITLE: "Real-time Command & Control Dashboard",
  PUBLIC_STATS_OUTSIDE: "In Transit (Outside Geofences)",
  PUBLIC_STATS_INSIDE: "Active Building Occupancy",
  PUBLIC_STATIONS_TITLE: "Live Station Overviews",
  PUBLIC_STATIONS_SUBTITLE: "Real-time inventory of assets across all managed perimeters",
  PUBLIC_NO_ASSETS: "No assets currently on-site",

  // Admin Dashboard
  ADMIN_INVENTORY_TITLE: "Corporate Inventory",
  ADMIN_CONTROLS_TITLE: "System Controls",
  ADMIN_DRAWING_GUIDE: "Tactical Drawing Guide",
  ADMIN_NO_PERIMETERS: "No Perimeters Defined",
  ADMIN_NO_PERIMETERS_SUBTEXT: "Click 'Draw Perimeter' to add your first secure building zone."
};
