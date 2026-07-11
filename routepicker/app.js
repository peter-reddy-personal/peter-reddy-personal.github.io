//---------------------------------------------------------
// VERSION BANNER
//---------------------------------------------------------
const jsVersion = "2026‑07‑08 22:15";

window.addEventListener("DOMContentLoaded", () => {
  const banner = document.getElementById("version-banner");
  if (banner) banner.textContent = "Zwift Ladder Route Picker — JS build: " + jsVersion;
});


//---------------------------------------------------------
// DEFAULT CLS RIDERS
//---------------------------------------------------------
const defaultCLS = [
  { name: "Anthony", team: "CLS", likelihood: 100, sprint: 789, punch: 739, climb: 653, tt: 577, pursuit: 614, endurance: 552 },
  { name: "Chris", team: "CLS", likelihood: 0, sprint: 648, punch: 610, climb: 511, tt: 514, pursuit: 550, endurance: 482 },
  { name: "Florian", team: "CLS", likelihood: 100, sprint: 638, punch: 541, climb: 623, tt: 700, pursuit: 613, endurance: 607 },
  { name: "James", team: "CLS", likelihood: 0, sprint: 739, punch: 709, climb: 565, tt: 559, pursuit: 603, endurance: 564 },
  { name: "Kestas", team: "CLS", likelihood: 0, sprint: 739, punch: 709, climb: 565, tt: 559, pursuit: 603, endurance: 564 },
  { name: "Kev", team: "CLS", likelihood: 100, sprint: 641, punch: 642, climb: 616, tt: 530, pursuit: 579, endurance: 550 },
  { name: "Kris", team: "CLS", likelihood: 0, sprint: 781, punch: 713, climb: 548, tt: 574, pursuit: 604, endurance: 558 },
  { name: "Mike", team: "CLS", likelihood: 100, sprint: 699, punch: 735, climb: 648, tt: 649, pursuit: 655, endurance: 657 },
  { name: "Pete", team: "CLS", likelihood: 100, sprint: 892, punch: 861, climb: 662, tt: 581, pursuit: 683, endurance: 570 },
  { name: "Rich", team: "CLS", likelihood: 0, sprint: 726, punch: 708, climb: 663, tt: 710, pursuit: 653, endurance: 664 },
  { name: "Trev", team: "CLS", likelihood: 0, sprint: 540, punch: 592, climb: 650, tt: 610, pursuit: 707, endurance: 648 }
];

//---------------------------------------------------------
// DEFAULT OPPONENT RIDERS
//---------------------------------------------------------
const defaultOpponents = [
  { name: "Florian Wou ⚡️ [Foudre]", team: "Opponent", likelihood: 100, sprint: 879, punch: 720, climb: 583, tt: 687, pursuit: 599, endurance: 546 },
  { name: "C Amaury⚡Foudre", team: "Opponent", likelihood: 50, sprint: 823, punch: 790, climb: 663, tt: 670, pursuit: 665, endurance: 636 },
  { name: "Fred Nicaise ( Foudre )", team: "Opponent", likelihood: 10, sprint: 824, punch: 872, climb: 704, tt: 711, pursuit: 741, endurance: 719 },
  { name: "jf Morfin [Foudre]", team: "Opponent", likelihood: 100, sprint: 696, punch: 753, climb: 634, tt: 593, pursuit: 618, endurance: 593 },
  { name: "Marc Dagry (Foudre)", team: "Opponent", likelihood: 100, sprint: 744, punch: 692, climb: 713, tt: 689, pursuit: 672, endurance: 702 },
  { name: "Julien AUVRAY [FOUDRE -issy Tri]", team: "Opponent", likelihood: 100, sprint: 642, punch: 676, climb: 716, tt: 700, pursuit: 680, endurance: 716 },
  { name: "F red_JBL ⚡️(Foudre)", team: "Opponent", likelihood: 100, sprint: 768, punch: 760, climb: 694, tt: 611, pursuit: 699, endurance: 591 },
  { name: "Via Esapis.Via(Foudre)", team: "Opponent", likelihood: 100, sprint: 673, punch: 701, climb: 663, tt: 582, pursuit: 606, endurance: 575 },
  { name: "Yann BAP 85 🔥 ⚡️Foudre⚡️", team: "Opponent", likelihood: 50, sprint: 716, punch: 684, climb: 673, tt: 644, pursuit: 658, endurance: 632 },
  { name: "Martin Renard [Foudre ⚡️]", team: "Opponent", likelihood: 100, sprint: 897, punch: 843, climb: 687, tt: 700, pursuit: 721, endurance: 709 },
  { name: "Jf Kohl (foudre)", team: "Opponent", likelihood: 100, sprint: 724, punch: 663, climb: 538, tt: 705, pursuit: 626, endurance: 537 },
  { name: "K nightRider[Foudre]", team: "Opponent", likelihood: 10, sprint: 638, punch: 746, climb: 678, tt: 660, pursuit: 661, endurance: 651 },
  { name: "J. ISR [ Foudre⚡️]", team: "Opponent", likelihood: 100, sprint: 692, punch: 608, climb: 544, tt: 564, pursuit: 557, endurance: 511 },
  { name: "Sébastien Lessire⚡[Foudre]", team: "Opponent", likelihood: 100, sprint: 856, punch: 830, climb: 665, tt: 627, pursuit: 676, endurance: 600 }
];


//---------------------------------------------------------
// GLOBAL ROUTES VARIABLE
//---------------------------------------------------------
let routes = [];


//---------------------------------------------------------
// DOMContentLoaded — bind buttons + load saved team
//---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {

  loadSavedTeam();
  updateRiderCounts();

  // Ladder slider
  const ladderCheckbox = document.getElementById("ladder-slider");
  if (ladderCheckbox) {
    ladderCheckbox.addEventListener("change", () => {
      calculateRoutes();
    });
  }

  // Buttons
  document.getElementById('add-cls-btn').onclick = () => {
    addRiderRow('cls-container');
    updateRiderCounts();
  };

  document.getElementById('add-opp-btn').onclick = () => {
    addRiderRow('opp-container');
    updateRiderCounts();
  };

  document.getElementById('reset-cls-btn').onclick = resetCLS;

  document.getElementById('calculate-btn').onclick = calculateRoutes;
});

//---------------------------------------------------------
// clickable rows in output tables
//---------------------------------------------------------
document.addEventListener("click", (e) => {
  try {
    // If clicking the ZwiftInsider link, do NOT toggle
    if (e.target.closest(".route-link")) return;

    const row = e.target.closest(".route-row");
    if (!row) return;

    const route = row.dataset.route;
    const rawWorld = row.dataset.world;

    const worldMap = {
      "Watopia": "watopia",
      "France": "france",
      "Makuri Islands": "makuri-islands",
      "Scotland": "scotland",
      "London": "london",
      "Yorkshire": "yorkshire",
      "Innsbruck": "innsbruck",
      "Richmond": "richmond",
      "Paris": "paris",
      "Crit City": "crit-city",
      "Bologna": "bologna",
      "New York": "new-york"
    };

    const world = worldMap[rawWorld] || "watopia";

    const collapseRow = row.nextElementSibling;
    if (!collapseRow) return;

    const img = collapseRow.querySelector(".elevation-img");
    if (!img) return;

    // Remove multi-lap prefixes like "2x ", "3x ", "4x "
    const cleanedRoute = route.replace(/^\d+x\s+/i, "");

    // Convert to ZwiftInsider slug
    const safeRoute = cleanedRoute
      .toLowerCase()
      .replace(/[^a-z0-9\- ]/g, "")
      .replace(/ /g, "-");

    const svgUrl =
      `https://zwiftinsider.com/wp-content/routes/${world}/${safeRoute}.svg`;

    img.src = svgUrl;

    collapseRow.style.display =
      collapseRow.style.display === "none" ? "table-row" : "none";

  } catch (err) {
    console.warn("Route SVG failed or row structure missing:", err);
  }
});


//---------------------------------------------------------
// vELO2 and lik% text toggle
//---------------------------------------------------------
function toggleVelo2() {
  const content = document.getElementById('velo2-content');
  const chev = document.getElementById('velo2-chevron');

  if (content.style.display === 'block') {
    content.style.display = 'none';
    chev.style.transform = 'rotate(0deg)';
  } else {
    content.style.display = 'block';
    chev.style.transform = 'rotate(180deg)';
  }
}

function toggleLik() {
  const content = document.getElementById('lik-content');
  const chev = document.getElementById('lik-chevron');

  if (content.style.display === 'block') {
    content.style.display = 'none';
    chev.style.transform = 'rotate(0deg)';
  } else {
    content.style.display = 'block';
    chev.style.transform = 'rotate(180deg)';
  }
}


//---------------------------------------------------------
// Add Rider Row (empty)
//---------------------------------------------------------
function addRiderRow(sectionId) {
  const container = document.getElementById(sectionId);
  if (!container) return;

  const row = document.createElement('div');
  row.classList.add('rider-row');

  row.innerHTML = `
    <input type="text" class="rider-name" placeholder="Name">
    <input type="number" class="rider-likelihood likelihood-field" placeholder="% Likelihood" value="100" min="0" max="100">

    <div class="factor-gap"></div>

    <input type="number" class="rider-sprint" placeholder="SPR">
    <input type="number" class="rider-punch" placeholder="PUN">
    <input type="number" class="rider-climb" placeholder="CLI">
    <input type="number" class="rider-tt" placeholder="TT">
    <input type="number" class="rider-pursuit" placeholder="PUR">
    <input type="number" class="rider-endurance" placeholder="END">

    <button class="remove-rider">X</button>
  `;

  row.querySelector('.remove-rider').onclick = () => {
    row.remove();
    autoSaveTeam();
    updateRiderCounts();
  };

  attachAutoSave(row);
  attachPasteHandler(row);

  container.appendChild(row);
  autoSaveTeam();
}


//---------------------------------------------------------
// Add Rider Row With Pre-Filled Data
//---------------------------------------------------------
function addRiderRowWithData(r) {
  const sectionId = r.team === "CLS" ? "cls-container" : "opp-container";
  const container = document.getElementById(sectionId);
  if (!container) return;

  const row = document.createElement('div');
  row.classList.add('rider-row');

  row.innerHTML = `
    <input type="text" class="rider-name" value="${r.name}">
    <input type="number" class="rider-likelihood likelihood-field" value="${r.likelihood}" min="0" max="100">

    <div class="factor-gap"></div>

    <input type="number" class="rider-sprint" value="${r.sprint}">
    <input type="number" class="rider-punch" value="${r.punch}">
    <input type="number" class="rider-climb" value="${r.climb}">
    <input type="number" class="rider-tt" value="${r.tt}">
    <input type="number" class="rider-pursuit" value="${r.pursuit}">
    <input type="number" class="rider-endurance" value="${r.endurance}">

    <button class="remove-rider">X</button>
  `;

  row.querySelector('.remove-rider').onclick = () => {
    row.remove();
    autoSaveTeam();
    updateRiderCounts();
  };

  attachAutoSave(row);
  attachPasteHandler(row);

  container.appendChild(row);
}


//---------------------------------------------------------
// Read Rider Inputs
//---------------------------------------------------------
function getRiders() {
  const rows = document.querySelectorAll('.rider-row');
  const riders = [];

  rows.forEach(row => {
    const parentId = row.parentElement.id;
    const team = parentId === "cls-container" ? "CLS" : "Opponent";

    riders.push({
      name: row.querySelector('.rider-name').value,
      team: team,
      likelihood: Number(row.querySelector('.rider-likelihood').value) || 0,
      sprint: Number(row.querySelector('.rider-sprint').value),
      punch: Number(row.querySelector('.rider-punch').value),
      climb: Number(row.querySelector('.rider-climb').value),
      tt: Number(row.querySelector('.rider-tt').value),
      pursuit: Number(row.querySelector('.rider-pursuit').value),
      endurance: Number(row.querySelector('.rider-endurance').value)
    });
  });

  return riders;
}


//---------------------------------------------------------
// Auto-save Team
//---------------------------------------------------------
function autoSaveTeam() {
  const riders = getRiders();
  localStorage.setItem('routepicker_team', JSON.stringify(riders));
  updateRiderCounts();
}

function attachAutoSave(row) {
  row.querySelectorAll('input').forEach(el => {
    el.oninput = () => {
      if (el.classList.contains('rider-likelihood')) {
        if (el.value < 0) el.value = 0;
        if (el.value > 100) el.value = 100;
      }
      autoSaveTeam();
    };
  });
}


//---------------------------------------------------------
// Multi-line Paste Handler (TT before PUR)
//---------------------------------------------------------
function attachPasteHandler(row) {

  const fields = [
    row.querySelector('.rider-sprint'),
    row.querySelector('.rider-punch'),
    row.querySelector('.rider-climb'),
    row.querySelector('.rider-tt'),
    row.querySelector('.rider-pursuit'),
    row.querySelector('.rider-endurance')
  ];

  fields.forEach(field => {
    field.addEventListener('paste', (event) => {
      event.preventDefault();

      const text = event.clipboardData.getData('text');
      const lines = text.trim().split(/\s+/);

      if (lines.length !== 6) {
        field.value = text;
        autoSaveTeam();
        return;
      }

      const nums = lines.map(n => Number(n));

      fields[0].value = nums[0];
      fields[1].value = nums[1];
      fields[2].value = nums[2];
      fields[3].value = nums[3]; // TT
      fields[4].value = nums[4]; // PUR
      fields[5].value = nums[5];

      autoSaveTeam();
    });
  });
}

//---------------------------------------------------------
// Reset CLS + Opponent teams to defaults
//---------------------------------------------------------
function resetCLS() {

  document.getElementById('cls-container').innerHTML = '';
  document.getElementById('opp-container').innerHTML = '';

  defaultCLS.forEach(r => addRiderRowWithData(r));
  defaultOpponents.forEach(r => addRiderRowWithData(r));

  autoSaveTeam();
  updateRiderCounts();
  calculateRoutes();
}


//---------------------------------------------------------
// Load Saved Team OR Defaults
//---------------------------------------------------------
function loadSavedTeam() {
  const saved = localStorage.getItem('routepicker_team');

  document.getElementById('cls-container').innerHTML = '';
  document.getElementById('opp-container').innerHTML = '';

  if (!saved) {
    defaultCLS.forEach(r => addRiderRowWithData(r));
    defaultOpponents.forEach(r => addRiderRowWithData(r));
    autoSaveTeam();
    return;
  }

  const riders = JSON.parse(saved);
  riders.forEach(r => addRiderRowWithData(r));
}


//---------------------------------------------------------
// Rider counts
//---------------------------------------------------------
function updateRiderCounts() {
  const clsCount = document.querySelectorAll('#cls-container .rider-row').length;
  const oppCount = document.querySelectorAll('#opp-container .rider-row').length;

  const clsLabel = document.getElementById('cls-count');
  const oppLabel = document.getElementById('opp-count');

  if (clsLabel) clsLabel.textContent = `${clsCount} rider${clsCount === 1 ? '' : 's'}`;
  if (oppLabel) oppLabel.textContent = `${oppCount} rider${oppCount === 1 ? '' : 's'}`;
}


//---------------------------------------------------------
// Load Routes JSON
//---------------------------------------------------------
async function loadRoutes() {
  const response = await fetch('./routes.json');
  routes = await response.json();
  return routes;
}


//---------------------------------------------------------
// Compute Single Rider Score (TT before PUR)
//---------------------------------------------------------
function computeSingleScore(route, r) {
  return (
    r.sprint    * route.Sprint +
    r.punch     * route.Punch +
    r.climb     * route.Climb +
    r.tt        * route.TT +
    r.pursuit   * route.Pursuit +
    r.endurance * route.Endurance
  );
}


//---------------------------------------------------------
// Weighted CLS / Opponent Averages per route
//---------------------------------------------------------
function computeRouteScores(route, riders) {

  const cls = riders.filter(r => r.team === 'CLS');
  const opp = riders.filter(r => r.team === 'Opponent');

  function weightedAvg(team) {
    const totalWeight = team.reduce((sum, r) => sum + r.likelihood, 0);
    if (totalWeight === 0) return 0;

    const weightedSum = team.reduce((sum, r) => {
      const score = computeSingleScore(route, r);
      return sum + score * r.likelihood;
    }, 0);

    return weightedSum / totalWeight;
  }

  const avgCLS = weightedAvg(cls);
  const avgOpp = weightedAvg(opp);

  return {
    avgCLS,
    avgOpp,
    diff: avgCLS - avgOpp
  };
}


//---------------------------------------------------------
// Format output tables with route weightings
//---------------------------------------------------------
function formatWeights(r) {
  const pct = x => (x * 100).toFixed(0) + "%";
  return `SPR ${pct(r.Sprint)}, PUN ${pct(r.Punch)}, CLI ${pct(r.Climb)}, PUR ${pct(r.Pursuit)}, END ${pct(r.Endurance)}`;
}


//---------------------------------------------------------
// Rank Routes
//---------------------------------------------------------
function rankRoutes(routes, riders) {

  const ladderOnly = document.getElementById("ladder-slider").checked;

  const filtered = ladderOnly
    ? routes.filter(r => r.Ladder === true)
    : routes;

  const scored = filtered.map(route => {
    const scores = computeRouteScores(route, riders);
    return {
      ...route,
      avgCLS: scores.avgCLS,
      avgOpp: scores.avgOpp,
      diff: scores.diff
    };
  });

  const bestCLS = [...scored].sort((a, b) => b.diff - a.diff);
  const bestOpp = [...scored].sort((a, b) => a.diff - b.diff);

  return { bestCLS, bestOpp };
}


//---------------------------------------------------------
// Render Team Averages with gradient differences
//---------------------------------------------------------
function renderAverages(riders) {
  const cls = riders.filter(r => r.team === "CLS");
  const opp = riders.filter(r => r.team === "Opponent");

  function weightedAvg(team, key) {
  const totalWeight = team.reduce((sum, r) => sum + r.likelihood, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = team.reduce((sum, r) => {
    return sum + (r[key] * r.likelihood);
  }, 0);

  return weightedSum / totalWeight;
  }


  const clsAvg = {
    sprint: weightedAvg(cls, "sprint"),
    punch: weightedAvg(cls, "punch"),
    climb: weightedAvg(cls, "climb"),
    tt: weightedAvg(cls, "tt"),
    pursuit: weightedAvg(cls, "pursuit"),
    endurance: weightedAvg(cls, "endurance")
  };

  const oppAvg = {
    sprint: weightedAvg(opp, "sprint"),
    punch: weightedAvg(opp, "punch"),
    climb: weightedAvg(opp, "climb"),
    tt: weightedAvg(opp, "tt"),
    pursuit: weightedAvg(opp, "pursuit"),
    endurance: weightedAvg(opp, "endurance")
  };


  const diff = {
    sprint: clsAvg.sprint - oppAvg.sprint,
    punch: clsAvg.punch - oppAvg.punch,
    climb: clsAvg.climb - oppAvg.climb,
    tt: clsAvg.tt - oppAvg.tt,
    pursuit: clsAvg.pursuit - oppAvg.pursuit,
    endurance: clsAvg.endurance - oppAvg.endurance
  };

  const values = Object.values(diff);
  const min = Math.min(...values);
  const max = Math.max(...values);

  function gradientStyle(value) {
  if (max === min) {
    return `background-color: rgb(235, 235, 235);`;
  }

  // Normalise 0 → 1
  const t = (value - min) / (max - min);

  // Soft green → soft red
  const start = { r: 210, g: 245, b: 225 }; // CLS advantage
  const end   = { r: 250, g: 215, b: 215 }; // Opp advantage

  const r = Math.round(start.r + (end.r - start.r) * (1 - t));
  const g = Math.round(start.g + (end.g - start.g) * (1 - t));
  const b = Math.round(start.b + (end.b - start.b) * (1 - t));

  return `background-color: rgb(${r}, ${g}, ${b});`;
}


  const tbody = document.getElementById("team-averages");

  tbody.innerHTML = `
    <tr>
      <td>CLS</td>
      <td>${clsAvg.sprint.toFixed(0)}</td>
      <td>${clsAvg.punch.toFixed(0)}</td>
      <td>${clsAvg.climb.toFixed(0)}</td>
      <td>${clsAvg.tt.toFixed(0)}</td>
      <td>${clsAvg.pursuit.toFixed(0)}</td>
      <td>${clsAvg.endurance.toFixed(0)}</td>
    </tr>
    <tr>
      <td>Opponent</td>
      <td>${oppAvg.sprint.toFixed(0)}</td>
      <td>${oppAvg.punch.toFixed(0)}</td>
      <td>${oppAvg.climb.toFixed(0)}</td>
      <td>${oppAvg.tt.toFixed(0)}</td>
      <td>${oppAvg.pursuit.toFixed(0)}</td>
      <td>${oppAvg.endurance.toFixed(0)}</td>
    </tr>
    <tr>
      <td>Difference</td>
      <td class="diff-cell" style="${gradientStyle(diff.sprint)}">${diff.sprint.toFixed(0)}</td>
      <td class="diff-cell" style="${gradientStyle(diff.punch)}">${diff.punch.toFixed(0)}</td>
      <td class="diff-cell" style="${gradientStyle(diff.climb)}">${diff.climb.toFixed(0)}</td>
      <td class="diff-cell" style="${gradientStyle(diff.tt)}">${diff.tt.toFixed(0)}</td>
      <td class="diff-cell" style="${gradientStyle(diff.pursuit)}">${diff.pursuit.toFixed(0)}</td>
      <td class="diff-cell" style="${gradientStyle(diff.endurance)}">${diff.endurance.toFixed(0)}</td>
    </tr>
  `;
}


//---------------------------------------------------------
// Render Route Results (with split weight columns + highlight strongest)
//---------------------------------------------------------
function renderResults(result) {

  const clsBody = document.getElementById('best-routes');
  const oppBody = document.getElementById('worst-routes');

  clsBody.innerHTML = '';
  oppBody.innerHTML = '';

  const pct = x => (x * 100).toFixed(0);

  function weightCells(r) {
    const weights = [
      pct(r.Sprint),
      pct(r.Punch),
      pct(r.Climb),
      pct(r.Pursuit),
      pct(r.Endurance)
    ];

    const maxVal = Math.max(...weights);

    return weights.map(w => {
      const cls = w == maxVal ? 'weight-strong' : '';
      return `<td class="${cls}">${w}%</td>`;
    }).join('');
  }

// -----------------------------
// Best CLS Routes
// -----------------------------
result.bestCLS.slice(0, 20).forEach(r => {
  const diffClass = r.diff >= 0 ? 'diff-positive' : 'diff-negative';

  // Main clickable route row
  clsBody.innerHTML += `
    <tr class="route-row" data-route="${r.Route}" data-world="${r.World}">
      <td>
        <a href="${r.URL}" target="_blank" class="route-link">${r.Route}</a>
      </td>

      <td>${r.Length} km</td>
      <td>${r.Elevation} m</td>
      <td>${r.Lead_in} km</td>

      <td>${r.avgCLS.toFixed(0)}</td>
      <td>${r.avgOpp.toFixed(0)}</td>
      <td class="${diffClass}">${r.diff.toFixed(0)}</td>

      ${weightCells(r)}
    </tr>

    <!-- Collapsible elevation profile row -->
    <tr class="collapse-row" style="display:none;">
      <td colspan="12">
        <div class="elevation-wrapper">
        <div class="elevation-scale">
          <img class="elevation-img">
        </div>
        </div>
      </td>
    </tr>
  `;
});



  // -----------------------------
  // Best Opponent Routes
  // -----------------------------
  result.bestOpp.slice(0, 20).forEach(r => {
    const diffClass = r.diff >= 0 ? 'diff-positive' : 'diff-negative';

    oppBody.innerHTML += `
      <tr class="route-row" data-route="${r.Route}" data-world="${r.World}">
      <td>
        <a href="${r.URL}" target="_blank" class="route-link">${r.Route}</a>
      </td>
      <td>${r.Length} km</td>
      <td>${r.Elevation} m</td>
      <td>${r.Lead_in} km</td>

      <td>${r.avgCLS.toFixed(0)}</td>
      <td>${r.avgOpp.toFixed(0)}</td>
      <td class="${diffClass}">${r.diff.toFixed(0)}</td>

      ${weightCells(r)}
    </tr>

    <!-- Collapsible elevation profile row -->
    <tr class="collapse-row" style="display:none;">
      <td colspan="12">
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


//---------------------------------------------------------
// Main Calculate Function
//---------------------------------------------------------
async function calculateRoutes() {
  await loadRoutes();
  const riders = getRiders();
  const ranked = rankRoutes(routes, riders);
  renderAverages(riders);
  renderResults(ranked);
}
