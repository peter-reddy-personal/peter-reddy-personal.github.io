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
  populateRouteSelectors,
  renderRouteRiderRankings,
  renderExpectedPoints,
  loadRouteElevation
} from "./renderer.js";
import { getRidersFromDOM, rankRoutes, rankRidersForRoute, calculateExpectedPoints } from "./calculations.js";

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
    populateRouteSelectors(appState.routes);

    // Populate team dropdowns with all teams
    populateOpponentDropdown(appState.allTeams, DOM_SELECTORS.homeTeamSelect);
    populateOpponentDropdown(appState.allTeams, DOM_SELECTORS.awayTeamSelect);

    // ===== RESTORE STATE =====
    appState.loadRiders();
    appState.loadSelectedHomeTeam();
    appState.loadSelectedAwayTeam();

    // ===== RENDER TEAMS =====
    // Restore home team (default to CLS)
    document.getElementById(DOM_SELECTORS.homeTeamSelect.replace("#", "")).value =
      appState.selectedHomeTeamNumber || CLS_TEAM_NUMBER;

    showLoadingMessage("home-table", LOADING_MESSAGES.homeRiders);
    await loadHomeTeam(true);

    // Restore away team if previously selected
    const savedAwayTeam = appState.selectedAwayTeamNumber;
    if (savedAwayTeam) {
      document.getElementById(DOM_SELECTORS.awayTeamSelect.replace("#", "")).value = savedAwayTeam;
      await loadAwayTeam(true);
    } else {
      appState.setAwayRiders([]);
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

  document.getElementById(DOM_SELECTORS.routeWorldSelect.replace("#", "")).addEventListener("change", (event) => {
    populateRouteSelectors(appState.routes, event.target.value);
    renderSelectedRoute();
  });
  document.getElementById(DOM_SELECTORS.routeSelect.replace("#", "")).addEventListener("change", renderSelectedRoute);

  // Randomness slider
  const randomnessSlider = document.getElementById(DOM_SELECTORS.randomnessSlider.replace("#", ""));
  const randomnessValue = document.getElementById(DOM_SELECTORS.randomnessValue.replace("#", ""));

  if (randomnessSlider) {
    randomnessSlider.addEventListener("input", () => {
      randomnessValue.textContent = `${randomnessSlider.value}%`;
      performCalculation();
    });
  }

  // Rider selection
  document.addEventListener("change", (e) => {
    if (!e.target.classList.contains("rider-select")) return;

    const row = e.target.closest(".rider-row");
    if (!row) return;

    const riders = row.dataset.team === "home" ? appState.homeRiders : appState.awayRiders;
    const rider = riders.find((item) => String(item.id) === row.dataset.id);
    if (!rider) return;

    rider.selected = e.target.checked;
    appState.saveRiders();
    renderRiderTable(riders, `${row.dataset.team}-table`, row.dataset.team);
    performCalculation();
  });

  // Toggle rider selection from anywhere on the row except the linked name
  document.addEventListener("click", (e) => {
    const row = e.target.closest(".rider-row");
    if (!row || e.target.closest(".rider-link") || e.target.closest(".rider-select")) return;

    const riders = row.dataset.team === "home" ? appState.homeRiders : appState.awayRiders;
    const rider = riders.find((item) => String(item.id) === row.dataset.id);
    if (!rider) return;

    rider.selected = rider.selected !== true;
    appState.saveRiders();
    renderRiderTable(riders, `${row.dataset.team}-table`, row.dataset.team);
    performCalculation();
  });

  // Select or unselect every rider on a team
  const setTeamSelection = (team, selected) => {
    const riders = team === "home" ? appState.homeRiders : appState.awayRiders;
    riders.forEach((rider) => {
      rider.selected = selected;
    });

    appState.saveRiders();
    renderRiderTable(riders, `${team}-table`, team);
    performCalculation();
  };

  document.getElementById(DOM_SELECTORS.selectAllHomeBtn.replace("#", "")).addEventListener("click", () => {
    setTeamSelection("home", true);
  });

  document.getElementById(DOM_SELECTORS.unselectAllHomeBtn.replace("#", "")).addEventListener("click", () => {
    setTeamSelection("home", false);
  });

  document.getElementById(DOM_SELECTORS.selectAllAwayBtn.replace("#", "")).addEventListener("click", () => {
    setTeamSelection("away", true);
  });

  document.getElementById(DOM_SELECTORS.unselectAllAwayBtn.replace("#", "")).addEventListener("click", () => {
    setTeamSelection("away", false);
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
async function loadHomeTeam(preserveSelection = false) {
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

    const savedSelections = new Map(
      appState.homeRiders.map((rider) => [String(rider.id), rider.selected === true])
    );
    const riders = await enrichTeam(homeTeam);
    appState.setHomeRiders(riders.map((rider) => ({
      ...rider,
      selected: preserveSelection ? savedSelections.get(String(rider.id)) !== false : true
    })));
    renderRiderTable(appState.homeRiders, "home-table", "home");
  } catch (error) {
    console.error("Error loading home team:", error);
    showLoadingMessage("home-table", "Error loading home team");
  }
}

/**
 * Load and render away team based on dropdown selection
 */
async function loadAwayTeam(preserveSelection = false) {
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

    const savedSelections = new Map(
      appState.awayRiders.map((rider) => [String(rider.id), rider.selected === true])
    );
    const riders = await enrichTeam(awayTeam);
    appState.setAwayRiders(riders.map((rider) => ({
      ...rider,
      selected: preserveSelection ? savedSelections.get(String(rider.id)) !== false : true
    })));
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
    renderBeeswarm(
      appState.homeRiders.filter((rider) => rider.selected === true),
      appState.awayRiders.filter((rider) => rider.selected === true)
    );
    renderResults(rankedRoutes);
    renderSelectedRoute();

    console.log("Calculation complete");
  } catch (error) {
    console.error("Error during calculation:", error);
  }
}

function renderSelectedRoute() {
  const routeSelect = document.getElementById(DOM_SELECTORS.routeSelect.replace("#", ""));
  const route = routeSelect && routeSelect.value !== ""
    ? appState.routes[Number(routeSelect.value)]
    : null;
  const homeRiders = appState.homeRiders
    .filter((rider) => rider.selected === true)
    .map((rider) => ({ ...rider, team: "home" }));
  const awayRiders = appState.awayRiders
    .filter((rider) => rider.selected === true)
    .map((rider) => ({ ...rider, team: "away" }));
  const selectedRiders = [...homeRiders, ...awayRiders];
  const homeTeam = appState.findTeam(appState.selectedHomeTeamNumber);
  const awayTeam = appState.findTeam(appState.selectedAwayTeamNumber);

  renderExpectedPoints(
    route,
    calculateExpectedPoints(route, homeRiders, awayRiders),
    homeTeam?.name || "Home",
    awayTeam?.name || "Away"
  );
  renderRouteRiderRankings(route, rankRidersForRoute(route, selectedRiders));
}
