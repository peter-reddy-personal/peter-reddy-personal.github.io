/**
 * Centralized state management with localStorage persistence
 */

import { LOCAL_STORAGE_KEYS, CLS_TEAM_NUMBER } from "./config.js";

class AppState {
  constructor() {
    this.allTeams = [];
    this.homeRiders = [];
    this.awayRiders = [];
    this.routes = [];
    this.selectedHomeTeamNumber = CLS_TEAM_NUMBER; // Default to CLS
    this.selectedAwayTeamNumber = null;
  }

  /**
   * Get all riders (home + away combined)
   */
  getAllRiders() {
    return [...this.homeRiders, ...this.awayRiders];
  }

  /**
   * Save rider lists to localStorage
   */
  saveRiders() {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.homeRiders,
      JSON.stringify(this.homeRiders)
    );
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.awayRiders,
      JSON.stringify(this.awayRiders)
    );
  }

  /**
   * Load rider lists from localStorage
   */
  loadRiders() {
    const savedHome = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_KEYS.homeRiders) || "[]"
    );
    const savedAway = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_KEYS.awayRiders) || "[]"
    );

    this.homeRiders = savedHome;
    this.awayRiders = savedAway;
  }

  /**
   * Save selected home team to localStorage
   */
  saveSelectedHomeTeam(teamNumber) {
    if (teamNumber) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.selectedHomeTeam, teamNumber);
      this.selectedHomeTeamNumber = teamNumber;
    }
  }

  /**
   * Load selected home team from localStorage
   */
  loadSelectedHomeTeam() {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.selectedHomeTeam);
    if (saved) {
      this.selectedHomeTeamNumber = parseInt(saved, 10);
      return this.selectedHomeTeamNumber;
    }
    return this.selectedHomeTeamNumber; // Return default (CLS)
  }

  /**
   * Save selected away team to localStorage
   */
  saveSelectedAwayTeam(teamNumber) {
    if (teamNumber) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.selectedAwayTeam, teamNumber);
      this.selectedAwayTeamNumber = teamNumber;
    }
  }

  /**
   * Load selected away team from localStorage
   */
  loadSelectedAwayTeam() {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.selectedAwayTeam);
    if (saved) {
      this.selectedAwayTeamNumber = parseInt(saved, 10);
      return this.selectedAwayTeamNumber;
    }
    return null;
  }

  /**
   * Find a team by number
   */
  findTeam(teamNumber) {
    return this.allTeams.find((t) => t.number === teamNumber);
  }

  /**
   * Remove a rider from home team
   */
  removeHomeRider(riderId) {
    this.homeRiders = this.homeRiders.filter((r) => String(r.id) !== String(riderId));
    this.saveRiders();
  }

  /**
   * Remove a rider from away team
   */
  removeAwayRider(riderId) {
    this.awayRiders = this.awayRiders.filter(
      (r) => String(r.id) !== String(riderId)
    );
    this.saveRiders();
  }

  /**
   * Replace home team riders
   */
  setHomeRiders(riders) {
    this.homeRiders = riders;
    this.saveRiders();
  }

  /**
   * Replace away team riders
   */
  setAwayRiders(riders) {
    this.awayRiders = riders;
    this.saveRiders();
  }

  /**
   * Clear all rider selections
   */
  clearAllRiders() {
    this.homeRiders = [];
    this.awayRiders = [];
    this.saveRiders();
  }
}

// Export singleton instance
export const appState = new AppState();
