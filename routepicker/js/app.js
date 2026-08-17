/**
 * Zwift Ladder Route Picker - Main Application
 * 
 * This is the main orchestrator that coordinates:
 * - State management (state.js)
 * - Data fetching (api.js)
 * - Rendering (renderer.js)
 * - Calculations (calculations.js)
 * - Utility functions (utils.js)
 */

import { APP_VERSION, DOM_SELECTORS, LOADING_MESSAGES, CLS_TEAM_NUMBER } from "./config.js";
import { appState } from "./state.js";
import { fetchAllTeams, fetchAllRoutes, enrichTeam } from "./api.js";
import {
  renderVersionBanner,
  initCollapsibles,
  populateOpponentDropdown,
  renderRiderTable,
  showLoadingMessage,
  renderAverages,
  renderBeeswarm,
  renderResults,
  loadRouteElevation
} from "./renderer.js";
import { getRidersFromDOM, rankRoutes } from "./calculations.js";

// =========================================================================
// INITIALIZATION
// =========================================================================

/**
 * Initialize the entire application
 * Called when DOM is fully loaded
 */
window.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing Zwift Ladder Route Picker...");

  try {
    // Set version banner
    renderVersionBanner(APP_VERSION);

    // Initialize UI components
    initCollapsibles();

    // ===== LOAD DATA =====
    console.log("Loading teams and routes...");
    appState.allTeams = await fetchAllTeams();
    appState.routes = await fetchAllRoutes();

    // Populate team dropdowns with all teams
    populateOpponentDropdown(appState.allTeams, DOM_SELECTORS.homeTeamSelect);
    populateOpponentDropdown(appState.allTeams, DOM_SELECTORS.awayTeamSelect);

    // ===== RESTORE STATE =====
    appState.loadRiders();
    appState.loadSelectedHomeTeam();
    appState.loadSelectedAwayTeam();

    // ===== RENDER TEAMS =====
    // Restore home team (default to CLS)
    showLoadingMessage("home-table", LOADING_MESSAGES.homeRiders);
    if (appState.homeRiders.length === 0) {
      await loadHomeTeam();
    } else {
      renderRiderTable(appState.homeRiders, "home-table", "home");
    }

    // Set home team dropdown value
    document.getElementById(DOM_SELECTORS.homeTeamSelect.replace("#", "")).value = 
      appState.selectedHomeTeamNumber || CLS_TEAM_NUMBER;

    // Restore away team if previously selected
    const savedAwayTeam = appState.selectedAwayTeamNumber;
    if (savedAwayTeam) {
      document.getElementById(DOM_SELECTORS.awayTeamSelect.replace("#", "")).value = savedAwayTeam;
      if (appState.awayRiders.length > 0) {
        renderRiderTable(appState.awayRiders, "away-table", "away");
      } else {
        await loadAwayTeam();
      }
    }

    // ===== ATTACH EVENT LISTENERS =====
    attachEventListeners();

    // ===== INITIAL CALCULATION =====
    performCalculation();

    console.log("Initialization complete");
  } catch (error) {
    console.error("Error during initialization:", error);
    showLoadingMessage("home-table", "Error loading data. Please refresh the page.");
  }
});

// =========================================================================
// EVENT LISTENERS
// =========================================================================

/**
 * Attach all event listeners to UI elements
 */
function attachEventListeners() {
  // Home team selection
  document.getElementById(DOM_SELECTORS.homeTeamSelect.replace("#", "")).addEventListener("change", async () => {
    await loadHomeTeam();
    appState.saveRiders();
    performCalculation();
  });

  // Away team selection
  document.getElementById(DOM_SELECTORS.awayTeamSelect.replace("#", "")).addEventListener("change", async () => {
    await loadAwayTeam();
    appState.saveRiders();
    performCalculation();
  });

  // Ladder toggle (ladder-only routes)
  document.getElementById(DOM_SELECTORS.ladderToggle.replace("#", "")).addEventListener("change", performCalculation);

  // Randomness slider
  const randomnessSlider = document.getElementById(DOM_SELECTORS.randomnessSlider.replace("#", ""));
  const randomnessValue = document.getElementById(DOM_SELECTORS.randomnessValue.replace("#", ""));

  if (randomnessSlider) {
    randomnessSlider.addEventListener("input", () => {
      randomnessValue.textContent = `${randomnessSlider.value}%`;
      performCalculation();
    });
  }

  // Reset home button
  document.getElementById(DOM_SELECTORS.resetHomeBtn.replace("#", "")).addEventListener("click", async () => {
    await loadHomeTeam();
    appState.saveRiders();
    performCalculation();
  });

  // Reset away button
  document.getElementById(DOM_SELECTORS.resetAwayBtn.replace("#", "")).addEventListener("click", async () => {
    await loadAwayTeam();
    appState.saveRiders();
    performCalculation();
  });

  // Power toggle (factor vs power view)
  document.querySelectorAll(DOM_SELECTORS.powerToggle).forEach((toggle) => {
    toggle.addEventListener("change", () => {
      const checked = toggle.checked;

      // Sync all toggles
      document.querySelectorAll(DOM_SELECTORS.powerToggle).forEach((t) => {
        t.checked = checked;
      });

      // Re-render tables
      renderRiderTable(appState.homeRiders, "home-table", "home");
      renderRiderTable(appState.awayRiders, "away-table", "away");

      appState.saveRiders();
    });
  });

  // Remove rider
  document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("remove-rider")) return;

    const factorRow = e.target.closest(".rider-row");
    if (!factorRow) return;

    const team = factorRow.dataset.team;
    const riderId = factorRow.dataset.id;

    // Remove from state
    if (team === "home") {
      appState.removeHomeRider(riderId);
    } else if (team === "away") {
      appState.removeAwayRider(riderId);
    }

    // Remove power row if present
    const powerRow = factorRow.nextElementSibling;
    if (powerRow && powerRow.classList.contains("power-mode")) {
      powerRow.remove();
    }
    factorRow.remove();

    // Re-render and recalculate
    renderRiderTable(appState.homeRiders, "home-table", "home");
    renderRiderTable(appState.awayRiders, "away-table", "away");
    performCalculation();
  });

  // Route collapse/expand
  document.addEventListener("click", (e) => {
    const row = e.target.closest(".route-row");
    if (!row) return;

    const collapseRow = row.nextElementSibling;
    if (!collapseRow || !collapseRow.classList.contains("collapse-row")) return;

    const isOpen = collapseRow.style.display !== "none";
    collapseRow.style.display = isOpen ? "none" : "table-row";

    // Load elevation image when opening
    if (!isOpen) {
      const img = collapseRow.querySelector(".elevation-img");
      if (img && !img.src) {
        loadRouteElevation(
          row.dataset.world || "",
          row.dataset.route || "",
          img
        );
      }
    }
  });
}

// =========================================================================
// DATA LOADING FUNCTIONS
// =========================================================================

/**
 * Load and render home team based on dropdown selection
 */
async function loadHomeTeam() {
  const select = document.getElementById(DOM_SELECTORS.homeTeamSelect.replace("#", ""));
  const teamNumber = parseInt(select.value, 10);

  if (!teamNumber) {
    showLoadingMessage("home-table", LOADING_MESSAGES.noTeamSelected);
    appState.setHomeRiders([]);
    return;
  }

  appState.saveSelectedHomeTeam(teamNumber);

  showLoadingMessage("home-table", LOADING_MESSAGES.homeRiders);
  await new Promise((resolve) => setTimeout(resolve, 0)); // allow paint

  try {
    const homeTeam = appState.findTeam(teamNumber);
    if (!homeTeam) {
      showLoadingMessage("home-table", LOADING_MESSAGES.teamNotFound);
      return;
    }

    appState.setHomeRiders(await enrichTeam(homeTeam));
    renderRiderTable(appState.homeRiders, "home-table", "home");
  } catch (error) {
    console.error("Error loading home team:", error);
    showLoadingMessage("home-table", "Error loading home team");
  }
}

/**
 * Load and render away team based on dropdown selection
 */
async function loadAwayTeam() {
  const select = document.getElementById(DOM_SELECTORS.awayTeamSelect.replace("#", ""));
  const teamNumber = parseInt(select.value, 10);

  if (!teamNumber) {
    showLoadingMessage("away-table", LOADING_MESSAGES.noTeamSelected);
    appState.setAwayRiders([]);
    return;
  }

  appState.saveSelectedAwayTeam(teamNumber);

  showLoadingMessage("away-table", LOADING_MESSAGES.awayRiders);
  await new Promise((resolve) => setTimeout(resolve, 0)); // allow paint

  try {
    const awayTeam = appState.findTeam(teamNumber);
    if (!awayTeam) {
      showLoadingMessage("away-table", LOADING_MESSAGES.teamNotFound);
      return;
    }

    appState.setAwayRiders(await enrichTeam(awayTeam));
    renderRiderTable(appState.awayRiders, "away-table", "away");
  } catch (error) {
    console.error("Error loading away team:", error);
    showLoadingMessage("away-table", "Error loading away team");
  }
}

// =========================================================================
// CALCULATION & RENDERING
// =========================================================================

/**
 * Main calculation function
 * Gets rider data, ranks routes, and renders results
 */
function performCalculation() {
  console.log("Performing route calculation...");

  try {
    // Get current rider factor values from DOM
    const riders = getRidersFromDOM();

    // Rank routes based on current state
    const rankedRoutes = rankRoutes(appState.routes, riders);

    // Render all results
    renderAverages(riders);
    renderBeeswarm(appState.homeRiders, appState.awayRiders);
    renderResults(rankedRoutes);

    console.log("Calculation complete");
  } catch (error) {
    console.error("Error during calculation:", error);
  }
}
