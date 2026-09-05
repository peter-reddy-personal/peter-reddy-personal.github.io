import { fetchAllTeams, enrichTeam } from "../../routepicker/js/api.js";
import { STORAGE_KEYS, SELECTORS } from "./config.js";
import { state, loadSavedState, saveState } from "./state.js";
import { eligibleOpponents, compareTeam, aggregateComparisons } from "./calculations.js";
import { populateTeams, renderRiders, renderSummary, renderComparisons, renderContext, renderLoadingState, showStatus } from "./renderer.js";

const select = () => document.querySelector(SELECTORS.team);

async function loadTeam(teamNumber) {
  const team = state.teams.find((candidate) => candidate.number === teamNumber);
  if (!team) {
    state.selectedTeam = null;
    state.riders = [];
    renderContext(null, 0);
    renderRiders([]);
    renderSummary({
      wins: 0,
      total: 0,
      averagePoints: 0,
      rankingStatus: "approximately correct position",
      routeConclusion: "",
      strengths: []
    });
    renderComparisons([], null);
    showStatus("Choose a team to begin.");
    return;
  }
  state.selectedTeam = team;
  renderLoadingState();
  showStatus("Loading team and qualifying opponents…");
  const savedRiders = new Map(loadSavedState().riders.map((rider) => [String(rider.id), rider.selected !== false]));
  const enrichedHome = await enrichTeam(team);
  state.riders = enrichedHome.map((rider) => ({ ...rider, selected: savedRiders.get(String(rider.id)) ?? true }));
  const opponents = eligibleOpponents(team, state.teams);
  const enrichedOpponents = await Promise.all(
    opponents.map(async (opponent) => ({
      ...opponent,
      riders: (await enrichTeam(opponent)).map((rider) => ({ ...rider, selected: true }))
    }))
  );
  state.comparisons = enrichedOpponents.map((opponent) => compareTeam(state.riders, opponent));
  renderContext(team, state.comparisons.length);
  renderRiders(state.riders);
  renderSummary(aggregateComparisons(state.comparisons, team, state.teams));
  renderComparisons(state.comparisons, team);
  saveState();
  showStatus(`Compared ${state.comparisons.length} reasonable opponents.`);
}

function attachEvents() {
  select().addEventListener("change", () => loadTeam(Number(select().value)));
  document.addEventListener("change", (event) => {
    if (!event.target.classList.contains("rider-select")) return;
    const rider = state.riders.find((item) => String(item.id) === event.target.dataset.id);
    if (!rider) return;
    rider.selected = event.target.checked;
    saveState();
    const refreshed = state.comparisons.map((comparison) => compareTeam(state.riders, comparison));
    state.comparisons = refreshed;
    renderRiders(state.riders);
    renderSummary(aggregateComparisons(refreshed, state.selectedTeam, state.teams));
    renderComparisons(refreshed, state.selectedTeam);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.matches("#select-all")) return;
    setAllRiders(!state.riders.every((rider) => rider.selected === true));
  });
}

function setAllRiders(selected) {
  state.riders.forEach((rider) => { rider.selected = selected; });
  saveState();
  const refreshed = state.comparisons.map((comparison) => compareTeam(state.riders, comparison));
  state.comparisons = refreshed;
  renderRiders(state.riders);
  renderSummary(aggregateComparisons(refreshed, state.selectedTeam, state.teams));
  renderComparisons(refreshed, state.selectedTeam);
}

window.addEventListener("DOMContentLoaded", async () => {
  try {
    state.teams = await fetchAllTeams("../routepicker/teams.json");
    populateTeams(state.teams);
    const saved = loadSavedState();
    const selected = saved.team || state.teams[0]?.number;
    select().value = selected ? String(selected) : "";
    attachEvents();
    await loadTeam(selected);
  } catch (error) {
    console.error("Error initializing challenger comparison:", error);
    showStatus("Error loading data. Please refresh the page.");
  }
});
