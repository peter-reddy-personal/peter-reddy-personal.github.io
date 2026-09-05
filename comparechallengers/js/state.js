import { STORAGE_KEYS } from "./config.js";

export const state = {
  teams: [],
  selectedTeam: null,
  riders: [],
  comparisons: []
};

export function loadSavedState() {
  const team = localStorage.getItem(STORAGE_KEYS.team);
  const riders = JSON.parse(localStorage.getItem(STORAGE_KEYS.riders) || "[]");
  return { team: team ? Number(team) : null, riders: Array.isArray(riders) ? riders : [] };
}

export function saveState() {
  if (state.selectedTeam) localStorage.setItem(STORAGE_KEYS.team, String(state.selectedTeam.number));
  localStorage.setItem(STORAGE_KEYS.riders, JSON.stringify(state.riders));
}
