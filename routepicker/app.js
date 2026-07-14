//---------------------------------------------------------
// VERSION BANNER
//---------------------------------------------------------
const jsVersion = "2026‑07‑14 16:15";

window.addEventListener("DOMContentLoaded", () => {
  const banner = document.getElementById("version-banner");
  if (banner) banner.textContent = "Zwift Ladder Route Picker — JS build: " + jsVersion;
});


// ---------------------------------------------------------
// GLOBAL STATE
// ---------------------------------------------------------

let allTeams = [];
let clsTeam = null;          // team n=63
let clsRiders = [];
let opponentRiders = [];
let routes = [];             // loaded from routes.json


// ---------------------------------------------------------
// LOAD TEAMS.JSON
// ---------------------------------------------------------

async function loadTeams() {
  console.log("Loading teams.json...");

  const res = await fetch("teams.json");
  console.log("Fetch status:", res.status);

  allTeams = await res.json();
  console.log("Teams loaded:", allTeams.length);

  clsTeam = allTeams.find(t => t.number === 63);
  console.log("CLS team found:", clsTeam);
}

// ---------------------------------------------------------
// FETCH ZWIFTRACING DATA FOR A RIDER
// ---------------------------------------------------------

async function fetchZwiftRacingRider(riderId) {
  console.log("Fetching ZR via Worker for:", riderId);

  const url = `https://zwiftracingappdata.peter-reddy95.workers.dev/${riderId}`;

  const res = await fetch(url);

  if (!res.ok) {
    console.error("Worker fetch failed:", res.status);
    return null;
  }

  const data = await res.json();

  // NEW: ZwiftRacing data is inside data.props.pageProps.rider
  const rider = data?.props?.pageProps?.rider;

  if (!rider) {
    console.error("No rider object found in Worker JSON");
    return null;
  }

  console.log("ZR rider:", rider);
  return rider;
}


// ---------------------------------------------------------
// ENRICH A TEAM WITH ZWIFTRACING DATA
// ---------------------------------------------------------

async function enrichTeam(team) {
  const enriched = [];

  for (const rider of team.riders) {
    const zr = await fetchZwiftRacingRider(rider.id);
    enriched.push({ ...rider, zr });
  }

  return enriched;
}

// ---------------------------------------------------------
// AUTO‑LOAD CLS RIDERS
// ---------------------------------------------------------

async function renderCLS() {
  console.log("Rendering CLS...");
  console.log("clsTeam:", clsTeam);

  if (!clsTeam) {
    console.error("CLS team not found — cannot render.");
    return;
  }

  clsRiders = await enrichTeam(clsTeam);
  console.log("CLS enriched:", clsRiders);

  renderUnifiedCLSTable(clsRiders);
}

// ---------------------------------------------------------
// POPULATE OPPONENT DROPDOWN
// ---------------------------------------------------------

function populateOpponentDropdown() {
  console.log("Populating opponent dropdown...");
  console.log("Teams available:", allTeams.length);

  const select = document.getElementById("opponentSelect");

  allTeams.forEach(team => {
    if (team.number !== 63) {
      const opt = document.createElement("option");
      opt.value = team.number;
      opt.textContent = team.name;
      select.appendChild(opt);
    }
  });

  console.log("Dropdown populated.");
}

// ---------------------------------------------------------
// WHEN OPPONENT SELECTED → LOAD THEIR RIDERS
// ---------------------------------------------------------

async function onOpponentSelected() {
  const select = document.getElementById("opponentSelect");
  const teamNumber = parseInt(select.value, 10);

  const opponentTeam = allTeams.find(t => t.number === teamNumber);
  opponentRiders = await enrichTeam(opponentTeam);

  renderUnifiedOpponentTable(opponentRiders);
}

// ---------------------------------------------------------
// RENDER UNIFIED CLS TABLE
// ---------------------------------------------------------

function renderUnifiedCLSTable(riders) {
  const div = document.getElementById("cls-table");
  div.innerHTML = "";

  // Table header
  const header = document.createElement("div");
  header.className = "input-headings";
  header.innerHTML = `
    <div>Name</div>
    <div>Lik%</div>
    <div>SPR</div>
    <div>PUN</div>
    <div>CLI</div>
    <div>TT</div>
    <div>PUR</div>
    <div>END</div>
    <div></div>
  `;
  div.appendChild(header);

  riders.forEach(r => {
    const zr = r.zr || {};

    const factors = zr.velo?.factors || {};

    const row = document.createElement("div");
    row.className = "rider-row";

    row.innerHTML = `
      <input class="rider-name" value="${r.name}">
      <input class="rider-likelihood" value="${r.likelihood ?? 100}">
      <input class="rider-sprint" value="${Math.round(factors.sprint || 0)}">
      <input class="rider-punch" value="${Math.round(factors.punch || 0)}">
      <input class="rider-climb" value="${Math.round(factors.climb || 0)}">
      <input class="rider-tt" value="${Math.round(factors.timeTrial || 0)}">
      <input class="rider-pursuit" value="${Math.round(factors.pursuit || 0)}">
      <input class="rider-endurance" value="${Math.round(factors.endurance || 0)}">
      <button class="remove-rider">X</button>
    `;

    div.appendChild(row);
  });
}

// ---------------------------------------------------------
// RENDER UNIFIED Opponent TABLE
// ---------------------------------------------------------

function renderUnifiedOpponentTable(riders) {
  const div = document.getElementById("opp-table");
  div.innerHTML = "";

  // Header row
  const header = document.createElement("div");
  header.className = "input-headings";
  header.innerHTML = `
    <div>Name</div>
    <div>Lik%</div>
    <div>SPR</div>
    <div>PUN</div>
    <div>CLI</div>
    <div>TT</div>
    <div>PUR</div>
    <div>END</div>
    <div></div>
  `;
  div.appendChild(header);

  riders.forEach(r => {
    const zr = r.zr || {};
    const factors = zr.velo?.factors || {};

    const row = document.createElement("div");
    row.className = "rider-row";

    row.innerHTML = `
      <input class="rider-name" value="${r.name}">
      <input class="rider-likelihood" value="${r.likelihood ?? 100}">
      <input class="rider-sprint" value="${Math.round(factors.sprint || 0)}">
      <input class="rider-punch" value="${Math.round(factors.punch || 0)}">
      <input class="rider-climb" value="${Math.round(factors.climb || 0)}">
      <input class="rider-tt" value="${Math.round(factors.timeTrial || 0)}">
      <input class="rider-pursuit" value="${Math.round(factors.pursuit || 0)}">
      <input class="rider-endurance" value="${Math.round(factors.endurance || 0)}">
      <button class="remove-rider">X</button>
    `;

    div.appendChild(row);
  });
}

// ---------------------------------------------------------
// SINGLE PAGE LOAD BLOCK
// ---------------------------------------------------------

window.addEventListener("DOMContentLoaded", async () => {
  await loadTeams();
  populateOpponentDropdown();
  await renderCLS();

  const resRoutes = await fetch("routes.json");
  routes = await resRoutes.json();
  console.log("Routes loaded:", routes.length);

  document.getElementById("opponentSelect")
    .addEventListener("change", onOpponentSelected);

  document.getElementById('add-opp-btn').onclick = () => {
    addRiderRow('opp-table');
  };

  document.getElementById('calculate-btn').onclick = calculateRoutes;
});


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
  };

  attachAutoSave(row);
  attachPasteHandler(row);

  container.appendChild(row);
  autoSaveTeam();
}


//---------------------------------------------------------
// Read Rider Inputs
//---------------------------------------------------------
function getRiders() {
  const rows = document.querySelectorAll('.rider-row');
  const riders = [];

  rows.forEach(row => {
    const parentId = row.parentElement.id;
    const team = parentId === "cls-table" ? "CLS" : "Opponent";

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
  const riders = getRiders();
  const ranked = rankRoutes(routes, riders);
  renderAverages(riders);
  renderResults(ranked);
}
