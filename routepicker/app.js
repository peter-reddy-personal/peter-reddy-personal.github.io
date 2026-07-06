//---------------------------------------------------------
// VERSION BANNER
//---------------------------------------------------------
const jsVersion = "2026‑07‑06 21:25";

window.addEventListener("DOMContentLoaded", () => {
  const banner = document.getElementById("version-banner");
  if (banner) banner.textContent = "Zwift Ladder Route Picker — JS build: " + jsVersion;
});


//---------------------------------------------------------
// DEFAULT CLS RIDERS
//---------------------------------------------------------
const defaultCLS = [
  { name: "Anthony", team: "CLS", likelihood: 100, sprint: 781, punch: 731, climb: 624, tt: 608, pursuit: 593, endurance: 577 },
  { name: "Chris",   team: "CLS", likelihood: 10,  sprint: 648, punch: 610, climb: 511, tt: 514, pursuit: 550, endurance: 482 },
  { name: "Florian", team: "CLS", likelihood: 10,  sprint: 512, punch: 523, climb: 614, tt: 587, pursuit: 682, endurance: 671 },
  { name: "James",   team: "CLS", likelihood: 10,  sprint: 739, punch: 709, climb: 565, tt: 559, pursuit: 603, endurance: 564 },
  { name: "Kestas",  team: "CLS", likelihood: 10,  sprint: 739, punch: 709, climb: 565, tt: 559, pursuit: 603, endurance: 564 },
  { name: "Kev",     team: "CLS", likelihood: 25,  sprint: 641, punch: 642, climb: 616, tt: 530, pursuit: 579, endurance: 550 },
  { name: "Kris",    team: "CLS", likelihood: 10,  sprint: 781, punch: 713, climb: 548, tt: 574, pursuit: 604, endurance: 558 },
  { name: "Mike",    team: "CLS", likelihood: 10,  sprint: 702, punch: 654, climb: 618, tt: 586, pursuit: 615, endurance: 606 },
  { name: "Pete",    team: "CLS", likelihood: 10,  sprint: 861, punch: 818, climb: 656, tt: 678, pursuit: 581, endurance: 580 },
  { name: "Rich",    team: "CLS", likelihood: 10,  sprint: 729, punch: 779, climb: 669, tt: 696, pursuit: 712, endurance: 722 },
  { name: "Trev",    team: "CLS", likelihood: 100, sprint: 540, punch: 592, climb: 650, tt: 610, pursuit: 707, endurance: 648 }
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


  // Ladder checkbox (original behaviour)
  const ladderCheckbox = document.getElementById("ladder-slider");
const toggleText = document.getElementById("toggle-text");

ladderCheckbox.addEventListener("change", () => {
  toggleText.textContent = ladderCheckbox.checked
    ? "Ladder routes only"
    : "All routes";
  calculateRoutes();
});


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
// Add Rider Row (empty)
//---------------------------------------------------------
function addRiderRow(sectionId) {
  const container = document.getElementById(sectionId);

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
// Reset CLS team to defaults
//---------------------------------------------------------
function resetCLS() {

  document.getElementById('cls-container').innerHTML = '';
  document.getElementById('opp-container').innerHTML = '';

  defaultCLS.forEach(r => addRiderRowWithData(r));

  autoSaveTeam();
  updateRiderCounts();
  calculateRoutes();
}


//---------------------------------------------------------
// Load Saved Team OR Default CLS Riders
//---------------------------------------------------------
function loadSavedTeam() {
  const saved = localStorage.getItem('routepicker_team');

  if (!saved) {
    document.getElementById('cls-container').innerHTML = '';
    document.getElementById('opp-container').innerHTML = '';

    defaultCLS.forEach(r => addRiderRowWithData(r));

    autoSaveTeam();
    return;
  }

  const riders = JSON.parse(saved);

  document.getElementById('cls-container').innerHTML = '';
  document.getElementById('opp-container').innerHTML = '';

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
// Weighted CLS / Opponent Averages
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
// Rank Routes (fixed sorting logic)
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
// Render average ELO comparison
//---------------------------------------------------------

function renderAverages(riders) {
  const cls = riders.filter(r => r.team === "CLS");
  const opp = riders.filter(r => r.team === "Opponent");

  function avg(team, key) {
    if (team.length === 0) return 0;
    return team.reduce((sum, r) => sum + r[key], 0) / team.length;
  }

  const clsAvg = {
    sprint: avg(cls, "sprint"),
    punch: avg(cls, "punch"),
    climb: avg(cls, "climb"),
    tt: avg(cls, "tt"),
    pursuit: avg(cls, "pursuit"),
    endurance: avg(cls, "endurance")
  };

  const oppAvg = {
    sprint: avg(opp, "sprint"),
    punch: avg(opp, "punch"),
    climb: avg(opp, "climb"),
    tt: avg(opp, "tt"),
    pursuit: avg(opp, "pursuit"),
    endurance: avg(opp, "endurance")
  };

  const diff = {
    sprint: clsAvg.sprint - oppAvg.sprint,
    punch: clsAvg.punch - oppAvg.punch,
    climb: clsAvg.climb - oppAvg.climb,
    tt: clsAvg.tt - oppAvg.tt,
    pursuit: clsAvg.pursuit - oppAvg.pursuit,
    endurance: clsAvg.endurance - oppAvg.endurance
  };

  // Find biggest CLS advantage (max positive diff)
  const maxKey = Object.keys(diff).reduce((best, key) =>
    diff[key] > diff[best] ? key : best
  );

  const tbody = document.getElementById("team-averages");

  function highlight(key) {
    return key === maxKey ? 'class="highlight-cell"' : "";
  }

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
      <td ${highlight("sprint")}>${diff.sprint.toFixed(0)}</td>
      <td ${highlight("punch")}>${diff.punch.toFixed(0)}</td>
      <td ${highlight("climb")}>${diff.climb.toFixed(0)}</td>
      <td ${highlight("tt")}>${diff.tt.toFixed(0)}</td>
      <td ${highlight("pursuit")}>${diff.pursuit.toFixed(0)}</td>
      <td ${highlight("endurance")}>${diff.endurance.toFixed(0)}</td>
    </tr>
  `;
}


//---------------------------------------------------------
// Render Results
//---------------------------------------------------------
function renderResults(result) {

  const clsBody = document.getElementById('best-routes');
  const oppBody = document.getElementById('worst-routes');

  clsBody.innerHTML = '';
  oppBody.innerHTML = '';

  result.bestCLS.slice(0, 10).forEach(r => {
    const diffClass = r.diff >= 0 ? 'diff-positive' : 'diff-negative';
    clsBody.innerHTML += `
      <tr>
        <td>${r.Route}</td>
        <td>${r.Length} km</td>
        <td>${r.Elevation} m</td>
        <td>${r.Lead_in} km</td>
        <td>${r.avgCLS.toFixed(0)}</td>
        <td>${r.avgOpp.toFixed(0)}</td>
        <td class="${diffClass}">${r.diff.toFixed(0)}</td>
      </tr>
    `;
  });

  result.bestOpp.slice(0, 10).forEach(r => {
    const diffClass = r.diff >= 0 ? 'diff-positive' : 'diff-negative';
    oppBody.innerHTML += `
      <tr>
        <td>${r.Route}</td>
        <td>${r.Length} km</td>
        <td>${r.Elevation} m</td>
        <td>${r.Lead_in} km</td>
        <td>${r.avgCLS.toFixed(0)}</td>
        <td>${r.avgOpp.toFixed(0)}</td>
        <td class="${diffClass}">${r.diff.toFixed(0)}</td>
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
  renderAverages(riders);   // NEW
  renderResults(ranked);
}

