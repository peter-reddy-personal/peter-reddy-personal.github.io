import { FACTORS, SELECTORS } from "./config.js";
import { getFactorValue } from "./calculations.js";

const format = (value) => {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value);
  return rounded === 0 ? "0" : String(rounded);
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
    const values = riders.map((rider) => getFactorValue(rider, key));
    return [key, { min: Math.min(...values), max: Math.max(...values) }];
  }));
  container.innerHTML = `<div class="rider-header"><button id="select-all" class="select-toggle${allSelected ? " selected" : ""}" type="button" aria-label="${allSelected ? "Unselect all riders" : "Select all riders"}" title="${allSelected ? "Unselect all riders" : "Select all riders"}"></button><span>Rider</span>${FACTORS.map(({ label }) => `<span>${label}</span>`).join("")}</div>` +
    riders.map((rider) => `<div class="rider-row${rider.selected ? "" : " rider-unselected"}">
      <input class="rider-select" type="checkbox" data-id="${rider.id}" ${rider.selected ? "checked" : ""} aria-label="Use ${rider.name}">
      <a href="https://zwiftracing.app/riders/${rider.id}" target="_blank">${rider.name}</a>
      ${FACTORS.map(({ key }) => `<span class="factor-cell" style="${factorGradient(getFactorValue(rider, key), ranges[key])}">${format(getFactorValue(rider, key))}</span>`).join("")}
    </div>`).join("");
}

function factorGradient(value, range) {
  if (!Number.isFinite(value) || range.min === range.max) return "background:#eef3fb";
  const ratio = (value - range.min) / (range.max - range.min);
  const hue = Math.round(5 + ratio * 120);
  return `background:hsl(${hue} 65% 88%)`;
}

export function renderSummary(summary) {
  el(SELECTORS.summary).innerHTML = `
    <div><strong>${summary.wins} <small>out of ${summary.total}</small></strong><span>expected wins</span></div>
    <div><strong>${format(summary.averagePoints)}</strong><span>average points</span></div>
    <div><strong>${summary.rankingStatus}</strong><span>compared to strength</span></div>`;
  el(SELECTORS.strengths).innerHTML = summary.strengths.length
    ? `<p class="route-conclusion">${summary.routeConclusion}</p>${summary.strengths.map((item, index) => `
      <article class="strength-card strength-level-${item.rank} ${item.difference >= 0 ? "strength-positive" : "strength-negative"}">
        <span class="strength-rank">${item.rank + 1}</span>
        <strong>${item.label}</strong>
        <span class="strength-verdict">${item.difference >= 0 ? (index === 0 ? "Strongest advantage" : "Better than opponent average") : (index === 0 ? "Least behind" : "Behind opponent average")}</span>
        <span class="strength-values">${format(item.teamAverage)} <b>vs</b> ${format(item.opponentAverage)}</span>
      </article>`).join("")}`
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
