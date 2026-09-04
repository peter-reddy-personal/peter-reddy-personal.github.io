/**
 * Configuration constants for the Zwift Ladder Route Picker
 */

export const APP_VERSION = "2026‑09‑04 17:15";

export const CLS_TEAM_NUMBER = 63;

export const DURATIONS = [
  { key: "wkg15", label: "15s" },
  { key: "wkg30", label: "30s" },
  { key: "wkg60", label: "1m" },
  { key: "wkg120", label: "2m" },
  { key: "wkg300", label: "5m" },
  { key: "wkg1200", label: "20m" }
];

export const POWER_STATS = ["wkg5", "wkg15", "wkg30", "wkg60", "wkg120", "wkg300", "wkg1200"];

export const DOM_SELECTORS = {
  // Main containers
  versionBanner: "#version-banner",
  homeTable: "#home-table",
  awayTable: "#away-table",
  
  // Team selection
  homeTeamSelect: "#homeTeamSelect",
  awayTeamSelect: "#awayTeamSelect",
  
  // Controls
  ladderToggle: "#ladder-toggle",
  randomnessSlider: "#randomness-slider",
  randomnessValue: "#randomness-value",
  powerToggle: ".power-toggle",
  
  // Buttons
  selectAllHomeBtn: "#select-all-home",
  unselectAllHomeBtn: "#unselect-all-home",
  selectAllAwayBtn: "#select-all-away",
  unselectAllAwayBtn: "#unselect-all-away",
  
  // Tables & Results
  teamAverages: "#team-averages",
  powerBeeswarm: "#powerBeeswarm",
  bestRoutes: "#best-routes",
  worstRoutes: "#worst-routes",
  routeWorldSelect: "#route-world-select",
  routeSelect: "#route-select",
  routeInfo: "#route-info",
  routeProfile: "#route-profile",
  expectedPoints: "#expected-points",
  routeRiderRankings: "#route-rider-rankings",
  
  // Riders
  riderRow: ".rider-row",
  riderLink: ".rider-link",
  
  // Collapsibles
  collapsible: ".collapsible",
  collapsibleHeader: ".collapsible-header",
  chevron: ".chevron"
};

export const API_ENDPOINTS = {
  teams: "teams.json",
  routes: "routes.json",
  zwiftRacing: (riderId) => `https://zwiftracingappdata.peter-reddy95.workers.dev/${riderId}`
};

export const LOCAL_STORAGE_KEYS = {
  homeRiders: "homeRiders",
  awayRiders: "awayRiders",
  selectedHomeTeam: "selectedHomeTeam",
  selectedAwayTeam: "selectedAwayTeam"
};

export const VELO_FACTORS = [
  "sprint",
  "punch",
  "climb",
  "timeTrial",
  "pursuit",
  "endurance"
];

export const LOW_SAMPLE_THRESHOLD = 5; // minimum race finishes in 90 days

export const GRADIENT_COLORS = {
  neutral: "rgb(235, 235, 235)",
  stops: [
    { limit: 15, pos: "rgb(235, 255, 235)", neg: "rgb(255, 235, 235)" },
    { limit: 30, pos: "rgb(225, 250, 225)", neg: "rgb(250, 225, 225)" },
    { limit: 50, pos: "rgb(215, 245, 215)", neg: "rgb(245, 215, 215)" },
    { limit: 75, pos: "rgb(205, 240, 205)", neg: "rgb(240, 205, 205)" },
    { limit: 100, pos: "rgb(195, 235, 195)", neg: "rgb(235, 195, 195)" },
    { limit: 150, pos: "rgb(185, 230, 185)", neg: "rgb(230, 185, 185)" },
    { limit: 200, pos: "rgb(175, 225, 175)", neg: "rgb(225, 175, 175)" },
    { limit: 250, pos: "rgb(165, 220, 165)", neg: "rgb(220, 165, 165)" }
  ],
  maxPos: "rgb(155, 215, 155)",
  maxNeg: "rgb(215, 155, 155)"
};

export const BEESWARM_CONFIG = {
  cls: { label: "CLS", bg: "rgba(80,160,255,0.7)", border: "#4a90e2", offset: -0.10 },
  opp: { label: "Opponent", bg: "rgba(255,120,120,0.7)", border: "#e25a5a", offset: 0.10 },
  jitterRange: 0.12
};

export const TRIM_NAME_MAX = 23;

export const LOADING_MESSAGES = {
  homeRiders: "Loading home team riders…",
  awayRiders: "Loading away team riders…",
  noTeamSelected: "No team selected.",
  teamNotFound: "Team not found."
};

export const CHART_OPTIONS = {
  scatter: {
    scatter: {
      type: "scatter",
      options: {
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            title: { display: true, text: "w/kg" },
            beginAtZero: false
          }
        }
      }
    }
  }
};
