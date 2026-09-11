import { FACTORS, SELECTORS } from "./config.js";
import { getFactorValue } from "./calculations.js";
import { generateElevationUrl } from "../../routepicker/js/utils.js";

const format = (value) => {
  if (!Number.isFinite(value)) return "N/A";
  const rounded = Math.round(value);
  return rounded === 0 ? "N/A" : String(rounded);
};
const el = (selector) => document.querySelector(selector);

export function showStatus(message) { el(SELECTORS.status).textContent = message; }

export function renderLoadingState(message = "Loading team data…") {
  el(SELECTORS.riderTable).innerHTML = `<div class="loading-placeholder"><span class="loading-spinner"></span>${message}</div>`;
  el(SELECTORS.comparisons).innerHTML = `<tr><td colspan="8" class="loading-placeholder">${message}</td></tr>`;
  el(SELECTORS.summary).innerHTML = `<div class="loading-placeholder">Loading comparison summary…</div>`;
  el(SELECTORS.strengths).innerHTML = "";
}

export function populateTeams(teams) {
  const select = el(SELECTORS.team);
  teams.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach((team) => {
    select.appendChild(new Option(team.name, String(team.number)));
  });
}

export function renderRiders(riders) {
  const container = el(SELECTORS.riderTable);
  const allSelected = riders.length > 0 && riders.every((rider) => rider.selected === true);
  const ranges = Object.fromEntries(FACTORS.map(({ key }) => {
    const values = riders
      .map((rider) => getFactorValue(rider, key))
      .filter((value) => Number.isFinite(value) && value !== 0);
    return [key, {
      min: values.length ? Math.min(...values) : NaN,
      max: values.length ? Math.max(...values) : NaN
    }];
  }));
  container.innerHTML = `<div class="rider-header"><button id="select-all" class="select-toggle${allSelected ? " selected" : ""}" type="button" aria-label="${allSelected ? "Unselect all riders" : "Select all riders"}" title="${allSelected ? "Unselect all riders" : "Select all riders"}"></button><span>Rider</span>${FACTORS.map(({ label }) => `<span>${label}</span>`).join("")}</div>` +
    riders.map((rider) => `<div class="rider-row${rider.selected ? "" : " rider-unselected"}">
      <input class="rider-select" type="checkbox" data-id="${rider.id}" ${rider.selected ? "checked" : ""} aria-label="Use ${rider.name}">
      <a href="https://zwiftracing.app/riders/${rider.id}" target="_blank">${rider.name}</a>
      ${FACTORS.map(({ key }) => `<span class="factor-cell" style="${factorGradient(getFactorValue(rider, key), ranges[key])}">${format(getFactorValue(rider, key))}</span>`).join("")}
    </div>`).join("");
}

function factorGradient(value, range) {
  if (!Number.isFinite(value) || value === 0 || !Number.isFinite(range.min) || !Number.isFinite(range.max) || range.min === range.max) {
    return "background:#eef3fb";
  }
  const ratio = (value - range.min) / (range.max - range.min);
  const hue = Math.round(120 - ratio * 115);
  return `background:hsl(${hue} 65% 88%)`;
}

export function renderSummary(summary) {
  el(SELECTORS.summary).innerHTML = `
    <div><strong>${summary.wins} <small>out of ${summary.total}</small></strong><span>expected wins</span></div>
    <div><strong>${format(summary.averagePoints)}</strong><span>average points</span></div>
    <div><strong>${summary.rankingStatus}</strong><span>compared to strength of nearby teams</span></div>`;
  const positiveCount = summary.strengths.filter((item) => item.difference > 0).length;
  const negativeCount = summary.strengths.filter((item) => item.difference < 0).length;
  const allPositive = positiveCount === summary.strengths.length;
  const allNegative = negativeCount === summary.strengths.length;
  el(SELECTORS.strengths).innerHTML = summary.strengths.length
    ? `${summary.strengths.map((item, index) => `
      <article class="strength-card strength-level-${item.level} ${item.difference > 0 ? "strength-positive" : item.difference < 0 ? "strength-negative" : "strength-neutral"}">
        <span class="strength-rank">${item.rank > 0 ? "+" : ""}${item.rank}</span>
        <strong>${item.label}</strong>
        <span class="strength-verdict">${item.difference > 0
          ? (item.rank === positiveCount
            ? "Strongest advantage"
            : allPositive && item.rank === 1 ? "Weakest advantage" : item.rank > 0 ? "Above opponent average" : "")
          : item.difference < 0
            ? (item.rank === -negativeCount
              ? "Greatest disadvantage"
              : allNegative && item.rank === -1 ? "Least severe disadvantage" : "Below opponent average")
            : "Equal to opponent average"}</span>
        <span class="strength-values">${format(item.teamAverage)} <b>vs</b> ${format(item.opponentAverage)}</span>
      </article>`).join("")}`
      + `<p class="route-conclusion">${summary.routeConclusion}${summary.suggestedRoute
        ? ` <a href="${summary.suggestedRoute.URL}" target="_blank" rel="noopener noreferrer">${summary.suggestedRoute.Route}</a>.`
        : ""}</p>`
      + (summary.suggestedRoute
        ? `<div class="suggested-route-profile">
            <img src="${generateElevationUrl(summary.suggestedRoute.World, summary.suggestedRoute.Route)}" alt="${summary.suggestedRoute.Route} elevation profile">
          </div>`
        : "")
    : "<p>No qualifying opponents found.</p>";
}

export function renderComparisons(comparisons, selectedTeam) {
  const rows = [
    ...comparisons.map((comparison) => ({ type: "opponent", rank: comparison.positions.region.rank, comparison })),
    ...(selectedTeam ? [{ type: "selected", rank: selectedTeam.positions.region.rank, selectedTeam }] : [])
  ].sort((a, b) => a.rank - b.rank);
  el(SELECTORS.comparisons).innerHTML = rows.length ? rows.map((row) => row.type === "selected"
    ? `<tr class="selected-team-row"><td><strong>${row.selectedTeam.name}</strong> <span class="selected-label">Selected team</span></td><td>${row.rank}</td><td colspan="5">—</td><td>Baseline team</td></tr>`
    : `<tr><td>${row.comparison.name}</td><td>${row.rank}</td>
      ${FACTORS.map(({ key }) => `<td class="${row.comparison.differences[key] >= 0 ? "positive" : "negative"}">${format(row.comparison.differences[key])}</td>`).join("")}
      <td class="${row.comparison.points.home > row.comparison.points.away ? "expected-win" : "expected-loss"}">${format(row.comparison.points.home)}–${format(row.comparison.points.away)}</td></tr>`).join("")
    : `<tr><td colspan="8">No reasonable opponents found for this team.</td></tr>`;
}

export function renderContext(team, opponentCount) {
  el(SELECTORS.context).textContent = team
    ? `${team.positions?.region?.name || "Unknown region"} rank ${team.positions?.region?.rank ?? "N/A"} · ${opponentCount} qualifying opponents`
    : "";
}
