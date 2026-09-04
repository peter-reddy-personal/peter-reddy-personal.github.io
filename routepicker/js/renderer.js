/**
 * DOM rendering and UI update functions
 */

import { DOM_SELECTORS, POWER_STATS, DURATIONS, BEESWARM_CONFIG, LOADING_MESSAGES } from "./config.js";
import { trimName, slugify, cleanRouteName, generateElevationUrl, lerpColor, getGradientStyle, jitter, getElement, getElements, formatNumber } from "./utils.js";

/**
 * Set version banner text
 */
export function renderVersionBanner(version) {
  const banner = getElement(DOM_SELECTORS.versionBanner);
  if (banner) {
    banner.textContent = `Zwift Ladder Route Picker — JS build: ${version}`;
  }
}

/**
 * Initialize all collapsible sections
 */
export function initCollapsibles() {
  getElements(DOM_SELECTORS.collapsible).forEach((section) => {
    const header = section.querySelector(DOM_SELECTORS.collapsibleHeader);
    const chevron = section.querySelector(DOM_SELECTORS.chevron);
    const targetId = section.dataset.target;
    const content = document.getElementById(targetId);

    if (!header || !chevron || !content) {
      console.warn("Collapsible section missing required elements:", targetId);
      return;
    }

    header.addEventListener("click", () => {
      const isOpen = content.style.display === "block";
      content.style.display = isOpen ? "none" : "block";
      chevron.textContent = isOpen ? "▼" : "▲";
    });
  });
}

/**
 * Populate team dropdown with sorted teams
 * Can be used for home, away, or opponent team selection
 */
export function populateOpponentDropdown(teams, selectorId = null) {
  const selector = selectorId || DOM_SELECTORS.homeTeamSelect;
  const select = getElement(selector);
  if (!select) {
    console.error("Team select element not found:", selector);
    return;
  }

  // Sort teams alphabetically
  const sortedTeams = [...teams]
    .sort((a, b) => a.name.localeCompare(b.name));

  sortedTeams.forEach((team) => {
    const option = document.createElement("option");
    option.value = team.number;
    option.textContent = team.name;
    select.appendChild(option);
  });

  console.log(`Team dropdown populated with ${sortedTeams.length} teams`);
}

/**
 * Populate route selectors and keep the route list filtered by world.
 */
export function populateRouteSelectors(routes, world = "") {
  const worldSelect = getElement(DOM_SELECTORS.routeWorldSelect);
  const routeSelect = getElement(DOM_SELECTORS.routeSelect);
  if (!worldSelect || !routeSelect) {
    console.error("Route selector elements not found");
    return;
  }

  if (worldSelect.options.length <= 1) {
    [...new Set(routes.map((route) => route.World))]
      .sort((a, b) => a.localeCompare(b))
      .forEach((routeWorld) => {
        worldSelect.appendChild(new Option(routeWorld, routeWorld));
      });
  }

  worldSelect.value = world;
  const filteredRoutes = world
    ? routes.filter((route) => route.World === world)
    : routes;
  routeSelect.innerHTML = '<option value="">Select a route</option>';
  filteredRoutes.forEach((route) => {
    routeSelect.appendChild(new Option(`${route.World} — ${route.Route}`, String(routes.indexOf(route))));
  });
}

/**
 * Render the selected route profile and combined rider ranking.
 */
export function renderRouteRiderRankings(route, riders) {
  const info = getElement(DOM_SELECTORS.routeInfo);
  const profile = getElement(DOM_SELECTORS.routeProfile);
  const table = getElement(DOM_SELECTORS.routeRiderRankings);
  if (!info || !profile || !table) {
    console.error("Selected route result elements not found");
    return;
  }

  if (!route) {
    info.innerHTML = "<p>Select a route to see its details.</p>";
    profile.innerHTML = "<p>Select a route to see its profile and rider ranking.</p>";
    table.innerHTML = "";
    return;
  }

  info.innerHTML = `
    <div class="route-profile-details">
      <strong><a href="${route.URL}" target="_blank" class="route-link">${route.Route}</a></strong>
      <span class="route-world">${route.World}</span>
      <span class="route-type">${route.Type}</span>
      <span class="route-length">${route.Length} km</span>
      <span class="route-elevation">${route.Elevation} m elevation</span>
      <span class="route-lead-in">${route.Lead_in} km lead-in</span>
    </div>
  `;
  profile.innerHTML = `
    <div class="elevation-wrapper">
      <div class="elevation-scale"><img class="elevation-img" src="${generateElevationUrl(route.World, route.Route)}" alt="${route.Route} elevation profile"></div>
    </div>
  `;

  const ranked = riders
    .filter((rider) => rider.selected === true)
    .sort((a, b) => b.routeScore - a.routeScore);
  const powerHeaders = ["Weight", "Phenotype", "5s", "15s", "30s", "1m", "2m", "5m", "20m"];
  const powerKeys = ["wkg5", "wkg15", "wkg30", "wkg60", "wkg120", "wkg300", "wkg1200"];
  const powerRanges = Object.fromEntries(powerKeys.map((key) => {
    const values = ranked
      .map((rider) => rider.zr?.power?.[key]?.[0])
      .filter((value) => typeof value === "number");
    return [key, {
      min: values.length ? Math.min(...values) : NaN,
      max: values.length ? Math.max(...values) : NaN
    }];
  }));
  table.innerHTML = `
    <thead><tr>
      <th>Rider</th><th>Expected position</th><th>vELO score</th>
      ${powerHeaders.map((header) => `<th>${header}</th>`).join("")}
    </tr></thead>
    <tbody>
      ${ranked.length ? ranked.map((rider, index) => {
        const zr = rider.zr || {};
        const power = zr.power || {};
        return `<tr class="${rider.team === "home" ? "route-home-row" : "route-away-row"}">
          <td><a href="https://zwiftracing.app/riders/${rider.id}" target="_blank" class="rider-link">${trimName(rider.name)}</a>${rider.lowSampleWarning ? `<span class="low-sample-warning" title="Rider has fewer than 5 race finishes in 90 days. Data may be unreliable.">⚠️</span>` : ""}</td>
          <td>${index + 1}</td>
          <td>${formatNumber(rider.routeScore, 0)}</td>
          <td>${formatNumber(Math.round(zr.weight), 0)}</td>
          <td>${zr.phenotype?.value ?? "Unknown"}</td>
          ${powerKeys.map((key) => `<td style="background:${lerpColor(powerRanges[key].min, powerRanges[key].max, power[key]?.[0])};">${formatNumber(power[key]?.[0])}</td>`).join("")}
        </tr>`;
      }).join("") : `<tr><td colspan="12">No riders are selected.</td></tr>`}
    </tbody>
  `;
}

export function renderExpectedPoints(route, points, homeTeamName, awayTeamName) {
  const container = getElement(DOM_SELECTORS.expectedPoints);
  if (!container) {
    console.error("Expected points element not found");
    return;
  }

  if (!route) {
    container.innerHTML = "";
    return;
  }

  const homeWinner = points.home > points.away;
  const awayWinner = points.away > points.home;
  container.innerHTML = `
    <strong class="expected-result-label" title="Calculated as the average result across the selected riders. If 5 or more riders are selected, the calculation assumes a 5v5 race.">Expected result</strong>
    <div class="expected-scoreline">
      <span class="expected-team expected-home${homeWinner ? " expected-winner" : ""}">
        <span class="expected-team-name">${homeTeamName}</span>
        <span class="expected-score">${formatNumber(points.home, 0)}</span>
        <span class="expected-points-label">points</span>
      </span>
      <span class="expected-versus">v</span>
      <span class="expected-team expected-away${awayWinner ? " expected-winner" : ""}">
        <span class="expected-team-name">${awayTeamName}</span>
        <span class="expected-score">${formatNumber(points.away, 0)}</span>
        <span class="expected-points-label">points</span>
      </span>
    </div>
  `;
}

/**
 * Render unified rider table (CLS or Opponent)
 * Supports toggle between vELO factors and power metrics views
 */
export function renderRiderTable(riders, containerId, teamType) {
  const toggle = getElement(DOM_SELECTORS.powerToggle);
  const showPower = toggle ? toggle.checked : true;

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container not found: ${containerId}`);
    return;
  }

  container.innerHTML = "";

  // Calculate column min/max for power heatmap
  const columnMin = {};
  const columnMax = {};
  const factorKeys = ["sprint", "punch", "climb", "timeTrial", "pursuit", "endurance"];
  const factorMin = {};
  const factorMax = {};

  POWER_STATS.forEach((stat) => {
    const values = riders
      .map((r) => r.zr?.power?.[stat]?.[0])
      .filter((v) => typeof v === "number");

    columnMin[stat] = values.length ? Math.min(...values) : NaN;
    columnMax[stat] = values.length ? Math.max(...values) : NaN;
  });

  factorKeys.forEach((key) => {
    const values = riders
      .map((rider) => rider.zr?.velo?.factors?.[key])
      .filter((value) => typeof value === "number");

    factorMin[key] = values.length ? Math.min(...values) : NaN;
    factorMax[key] = values.length ? Math.max(...values) : NaN;
  });

  // Headers for factor view
  const factorHeader = document.createElement("div");
  factorHeader.className = "input-headings factors-mode factors-grid";
  factorHeader.innerHTML = `
    <div>Name</div>
    <div class="factor-spacer"></div>
    <div>SPR</div>
    <div>PUN</div>
    <div>CLI</div>
    <div>TT</div>
    <div>PUR</div>
    <div>END</div>
    <div title="Click the button to add or remove rider from team comparison.">Use</div>
  `;

  // Headers for power view
  const powerHeader = document.createElement("div");
  powerHeader.className = "input-headings power-mode power-grid";
  powerHeader.innerHTML = `
    <div>Name</div>
    <div>Weight</div>
    <div>Phenotype</div>
    <div>5s</div>
    <div>15s</div>
    <div>30s</div>
    <div>1m</div>
    <div>2m</div>
    <div>5m</div>
    <div>20m</div>
    <div title="Click the button to add or remove rider from team comparison.">Use</div>
  `;

  container.appendChild(factorHeader);
  container.appendChild(powerHeader);

  // Render each rider
  riders.forEach((rider) => {
    const zr = rider.zr || {};
    const factors = zr.velo?.factors || {};
    const power = zr.power || {};

    // Factor row
    const factorRow = document.createElement("div");
    factorRow.className = `rider-row factors-mode factors-grid${rider.selected === true ? "" : " rider-unselected"}`;
    factorRow.dataset.team = teamType;
    factorRow.dataset.id = String(rider.id);
    factorRow.innerHTML = `
      <a href="https://zwiftracing.app/riders/${rider.id}" target="_blank" class="rider-link">
        ${trimName(rider.name)}
        ${rider.lowSampleWarning ? `<span class="low-sample-warning" title="Rider has fewer than 5 race finishes in 90 days. Data may be unreliable.">⚠️</span>` : ""}
      </a>
      <div class="factor-spacer"></div>
      <div class="profile-cell rider-sprint" style="background:${lerpColor(factorMin.sprint, factorMax.sprint, factors.sprint)};">${formatNumber(factors.sprint, 0)}</div>
      <div class="profile-cell rider-punch" style="background:${lerpColor(factorMin.punch, factorMax.punch, factors.punch)};">${formatNumber(factors.punch, 0)}</div>
      <div class="profile-cell rider-climb" style="background:${lerpColor(factorMin.climb, factorMax.climb, factors.climb)};">${formatNumber(factors.climb, 0)}</div>
      <div class="profile-cell rider-tt" style="background:${lerpColor(factorMin.timeTrial, factorMax.timeTrial, factors.timeTrial)};">${formatNumber(factors.timeTrial, 0)}</div>
      <div class="profile-cell rider-pursuit" style="background:${lerpColor(factorMin.pursuit, factorMax.pursuit, factors.pursuit)};">${formatNumber(factors.pursuit, 0)}</div>
      <div class="profile-cell rider-endurance" style="background:${lerpColor(factorMin.endurance, factorMax.endurance, factors.endurance)};">${formatNumber(factors.endurance, 0)}</div>
      <div class="rider-selection">
        <input type="checkbox" class="rider-select" aria-label="Select ${trimName(rider.name)}" ${rider.selected === true ? "checked" : ""}>
      </div>
    `;

    // Power row with heatmap coloring
    const v5 = power.wkg5?.[0];
    const v15 = power.wkg15?.[0];
    const v30 = power.wkg30?.[0];
    const v60 = power.wkg60?.[0];
    const v120 = power.wkg120?.[0];
    const v300 = power.wkg300?.[0];
    const v1200 = power.wkg1200?.[0];

    const powerRow = document.createElement("div");
    powerRow.className = `rider-row power-mode power-grid${rider.selected === true ? "" : " rider-unselected"}`;
    powerRow.dataset.team = teamType;
    powerRow.dataset.id = String(rider.id);
    powerRow.innerHTML = `
      <a href="https://zwiftracing.app/riders/${rider.id}" target="_blank" class="rider-link">
        ${trimName(rider.name)}
        ${rider.lowSampleWarning ? `<span class="low-sample-warning" title="Rider has fewer than 5 race finishes in 90 days. Data may be unreliable.">⚠️</span>` : ""}
      </a>
      <div class="profile-cell weight">${Math.round(zr.weight) ?? "N/A"}</div>
      <div class="profile-cell phenotype">${zr.phenotype?.value ?? "Unknown"}</div>
      <div class="profile-cell wkg5"   style="background:${lerpColor(columnMin.wkg5,   columnMax.wkg5,   v5)};">${formatNumber(v5)}</div>
      <div class="profile-cell wkg15"  style="background:${lerpColor(columnMin.wkg15,  columnMax.wkg15,  v15)};">${formatNumber(v15)}</div>
      <div class="profile-cell wkg30"  style="background:${lerpColor(columnMin.wkg30,  columnMax.wkg30,  v30)};">${formatNumber(v30)}</div>
      <div class="profile-cell wkg60"  style="background:${lerpColor(columnMin.wkg60,  columnMax.wkg60,  v60)};">${formatNumber(v60)}</div>
      <div class="profile-cell wkg120" style="background:${lerpColor(columnMin.wkg120, columnMax.wkg120, v120)};">${formatNumber(v120)}</div>
      <div class="profile-cell wkg300" style="background:${lerpColor(columnMin.wkg300, columnMax.wkg300, v300)};">${formatNumber(v300)}</div>
      <div class="profile-cell wkg1200" style="background:${lerpColor(columnMin.wkg1200, columnMax.wkg1200, v1200)};">${formatNumber(v1200)}</div>
      <div class="rider-selection">
        <input type="checkbox" class="rider-select" aria-label="Select ${trimName(rider.name)}" ${rider.selected === true ? "checked" : ""}>
      </div>
    `;

    container.appendChild(factorRow);
    container.appendChild(powerRow);
  });

  // Toggle visibility based on power toggle state
  getElements(".factors-mode").forEach((el) => {
    el.style.display = showPower ? "none" : "grid";
  });
  getElements(".power-mode").forEach((el) => {
    el.style.display = showPower ? "grid" : "none";
  });
}

/**
 * Show loading message in a container
 */
export function showLoadingMessage(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<div class="loading-msg">${message}</div>`;
  }
}

/**
 * Render team average vELO scores with gradient differences
 */
export function renderAverages(riders) {
  const homeRiders = riders.filter((r) => r.team === "home" && r.selected === true);
  const awayRiders = riders.filter((r) => r.team === "away" && r.selected === true);

  function avg(team, key) {
    if (team.length === 0) return 0;
    const total = team.reduce((sum, r) => sum + (r[key] || 0), 0);
    return total / team.length;
  }

  const homeAvg = {
    sprint: avg(homeRiders, "sprint"),
    punch: avg(homeRiders, "punch"),
    climb: avg(homeRiders, "climb"),
    tt: avg(homeRiders, "tt"),
    pursuit: avg(homeRiders, "pursuit"),
    endurance: avg(homeRiders, "endurance")
  };

  const awayAvg = {
    sprint: avg(awayRiders, "sprint"),
    punch: avg(awayRiders, "punch"),
    climb: avg(awayRiders, "climb"),
    tt: avg(awayRiders, "tt"),
    pursuit: avg(awayRiders, "pursuit"),
    endurance: avg(awayRiders, "endurance")
  };

  const diff = {
    sprint: homeAvg.sprint - awayAvg.sprint,
    punch: homeAvg.punch - awayAvg.punch,
    climb: homeAvg.climb - awayAvg.climb,
    tt: homeAvg.tt - awayAvg.tt,
    pursuit: homeAvg.pursuit - awayAvg.pursuit,
    endurance: homeAvg.endurance - awayAvg.endurance
  };

  const tbody = getElement(DOM_SELECTORS.teamAverages);
  if (!tbody) {
    console.error("Team averages element not found");
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td>Home</td>
      <td>${formatNumber(homeAvg.sprint, 0)}</td>
      <td>${formatNumber(homeAvg.punch, 0)}</td>
      <td>${formatNumber(homeAvg.climb, 0)}</td>
      <td>${formatNumber(homeAvg.tt, 0)}</td>
      <td>${formatNumber(homeAvg.pursuit, 0)}</td>
      <td>${formatNumber(homeAvg.endurance, 0)}</td>
    </tr>
    <tr>
      <td>Away</td>
      <td>${formatNumber(awayAvg.sprint, 0)}</td>
      <td>${formatNumber(awayAvg.punch, 0)}</td>
      <td>${formatNumber(awayAvg.climb, 0)}</td>
      <td>${formatNumber(awayAvg.tt, 0)}</td>
      <td>${formatNumber(awayAvg.pursuit, 0)}</td>
      <td>${formatNumber(awayAvg.endurance, 0)}</td>
    </tr>
    <tr>
      <td>Difference</td>
      <td class="diff-cell" style="${getGradientStyle(diff.sprint)}">${formatNumber(diff.sprint, 0)}</td>
      <td class="diff-cell" style="${getGradientStyle(diff.punch)}">${formatNumber(diff.punch, 0)}</td>
      <td class="diff-cell" style="${getGradientStyle(diff.climb)}">${formatNumber(diff.climb, 0)}</td>
      <td class="diff-cell" style="${getGradientStyle(diff.tt)}">${formatNumber(diff.tt, 0)}</td>
      <td class="diff-cell" style="${getGradientStyle(diff.pursuit)}">${formatNumber(diff.pursuit, 0)}</td>
      <td class="diff-cell" style="${getGradientStyle(diff.endurance)}">${formatNumber(diff.endurance, 0)}</td>
    </tr>
  `;
}

/**
 * Render beeswarm chart showing power distribution across durations
 */
export function renderBeeswarm(homeRiders, awayRiders) {
  const homeData = DURATIONS.map((d) => ({
    label: d.label,
    values: homeRiders
      .map((r) => ({
        name: r.name,
        value: r.zr?.power?.[d.key]?.[0]
      }))
      .filter((v) => typeof v.value === "number")
  }));

  const awayData = DURATIONS.map((d) => ({
    label: d.label,
    values: awayRiders
      .map((r) => ({
        name: r.name,
        value: r.zr?.power?.[d.key]?.[0]
      }))
      .filter((v) => typeof v.value === "number")
  }));

  // Build scatter datasets
  function buildDataset(teamData, config) {
    const points = [];
    teamData.forEach((d, i) => {
      d.values.forEach((v) => {
        points.push({
          x: i + config.offset + jitter(BEESWARM_CONFIG.jitterRange),
          y: v.value,
          rider: v.name
        });
      });
    });
    return {
      label: config.label,
      data: points,
      backgroundColor: config.bg,
      borderColor: config.border,
      pointRadius: 6,
      pointHoverRadius: 8
    };
  }

  const datasets = [
    buildDataset(homeData, BEESWARM_CONFIG.cls),
    buildDataset(awayData, BEESWARM_CONFIG.opp)
  ];

  const canvas = getElement(DOM_SELECTORS.powerBeeswarm);
  if (!canvas) {
    console.error("Power beeswarm canvas not found");
    return;
  }

  const ctx = canvas.getContext("2d");

  // Destroy existing chart if present
  if (window.beeswarmChart) {
    window.beeswarmChart.destroy();
  }

  window.beeswarmChart = new Chart(ctx, {
    type: "scatter",
    data: { datasets },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) =>
              `${context.raw.rider}: ${context.raw.y.toFixed(1)} w/kg`
          }
        },
        legend: { display: false }
      },
      scales: {
        x: {
          min: -0.5,
          max: DURATIONS.length - 0.5,
          ticks: {
            callback: (i) => DURATIONS[i]?.label ?? ""
          },
          title: { display: false }
        },
        y: {
          title: { display: true, text: "w/kg" },
          beginAtZero: false
        }
      }
    }
  });
}

/**
 * Render route comparison results (best for home, best for away)
 */
export function renderResults(routes) {
  const homeBody = getElement(DOM_SELECTORS.bestRoutes);
  const awayBody = getElement(DOM_SELECTORS.worstRoutes);

  if (!homeBody || !awayBody) {
    console.error("Route results elements not found");
    return;
  }

  homeBody.innerHTML = "";
  awayBody.innerHTML = "";

  // Best home routes
  routes.bestCLS.slice(0, 20).forEach((route) => {
    const diffClass = route.diff >= 0 ? "diff-positive" : "diff-negative";

    homeBody.innerHTML += `
      <tr class="route-row" data-route="${route.Route}" data-world="${route.World}">
        <td><a href="${route.URL}" target="_blank" class="route-link">${route.Route}</a></td>
        <td>${route.Type}</td>
        <td>${route.Length} km</td>
        <td>${route.Elevation} m</td>
        <td>${route.Lead_in} km</td>
        <td>${formatNumber(route.avgHome, 0)}</td>
        <td>${formatNumber(route.avgAway, 0)}</td>
        <td class="${diffClass}">${formatNumber(route.diff, 0)}</td>
      </tr>
      <tr class="collapse-row" style="display:none;">
        <td colspan="8">
          <div class="elevation-wrapper">
            <div class="elevation-scale">
              <img class="elevation-img">
            </div>
          </div>
        </td>
      </tr>
    `;
  });

  // Best away routes
  routes.bestOpp.slice(0, 20).forEach((route) => {
    const diffClass = route.diff >= 0 ? "diff-positive" : "diff-negative";

    awayBody.innerHTML += `
      <tr class="route-row" data-route="${route.Route}" data-world="${route.World}">
        <td><a href="${route.URL}" target="_blank" class="route-link">${route.Route}</a></td>
        <td>${route.Type}</td>
        <td>${route.Length} km</td>
        <td>${route.Elevation} m</td>
        <td>${route.Lead_in} km</td>
        <td>${formatNumber(route.avgHome, 0)}</td>
        <td>${formatNumber(route.avgAway, 0)}</td>
        <td class="${diffClass}">${formatNumber(route.diff, 0)}</td>
      </tr>
      <tr class="collapse-row" style="display:none;">
        <td colspan="8">
          <div class="elevation-wrapper">
            <div class="elevation-scale">
              <img class="elevation-img">
            </div>
          </div>
        </td>
      </tr>
    `;
  });
}

/**
 * Get elevation chart image for a route (called when expanding route row)
 */
export function loadRouteElevation(worldName, routeName, imgElement) {
  const url = generateElevationUrl(worldName, routeName);
  console.log("Loading elevation image:", url);
  imgElement.src = url;
}
