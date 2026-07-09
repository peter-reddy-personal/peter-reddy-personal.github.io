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
  { name: "Anthony", team: "CLS", likelihood: 0, sprint: 784, punch: 735, climb: 653, tt: 577, pursuit: 610, endurance: 551 },
  { name: "Chris",   team: "CLS", likelihood: 0,   sprint: 648, punch: 610, climb: 511, tt: 514, pursuit: 550, endurance: 482 },
  { name: "Florian", team: "CLS", likelihood: 100, sprint: 512, punch: 523, climb: 614, tt: 587, pursuit: 682, endurance: 671 },
  { name: "James",   team: "CLS", likelihood: 0,   sprint: 739, punch: 709, climb: 565, tt: 559, pursuit: 603, endurance: 564 },
  { name: "Kestas",  team: "CLS", likelihood: 0,   sprint: 739, punch: 709, climb: 565, tt: 559, pursuit: 603, endurance: 564 },
  { name: "Kev",     team: "CLS", likelihood: 0,   sprint: 641, punch: 642, climb: 616, tt: 530, pursuit: 579, endurance: 550 },
  { name: "Kris",    team: "CLS", likelihood: 0,   sprint: 781, punch: 713, climb: 548, tt: 574, pursuit: 604, endurance: 558 },
  { name: "Mike",    team: "CLS", likelihood: 0,   sprint: 699, punch: 735, climb: 648, tt: 649, pursuit: 655, endurance: 657 },
  { name: "Pete",    team: "CLS", likelihood: 100,  sprint: 867, punch: 858, climb: 662, tt: 581, pursuit: 680, endurance: 569 },
  { name: "Rich",    team: "CLS", likelihood: 100, sprint: 729, punch: 779, climb: 669, tt: 696, pursuit: 712, endurance: 722 },
  { name: "Trev",    team: "CLS", likelihood: 100,  sprint: 540, punch: 592, climb: 650, tt: 610, pursuit: 707, endurance: 648 }
];


//---------------------------------------------------------
// DEFAULT OPPONENT RIDERS
//---------------------------------------------------------
const defaultOpponents = [
  { name: "Darrin Mackie Coalition",     team: "Opponent", likelihood: 100, sprint: 669, punch: 690, climb: 605, tt: 571, pursuit: 618, endurance: 508 },
  { name: "Rob Tomei",                   team: "Opponent", likelihood: 100, sprint: 747, punch: 736, climb: 684, tt: 628, pursuit: 665, endurance: 632 },
  { name: "Ed H (Coalition)",            team: "Opponent", likelihood: 100, sprint: 867, punch: 800, climb: 649, tt: 635, pursuit: 645, endurance: 628 },
  { name: "D aveG (COALITION)",          team: "Opponent", likelihood: 100, sprint: 721, punch: 758, climb: 627, tt: 647, pursuit: 629, endurance: 610 },
  { name: "Colin Mandy (COALITION)",     team: "Opponent", likelihood: 100, sprint: 804, punch: 765, climb: 687, tt: 635, pursuit: 646, endurance: 604 },
  { name: "Andrew Broadmoore",           team: "Opponent", likelihood: 100, sprint: 669, punch: 862, climb: 682, tt: 630, pursuit: 667, endurance: 622 },
  { name: "S N (COALITION)",             team: "Opponent", likelihood: 40, sprint: 846, punch: 762, climb: 649, tt: 681, pursuit: 659, endurance: 680 },
  { name: "Nikolas Daniel",              team: "Opponent", likelihood: 10,  sprint: 821, punch: 803, climb: 674, tt: 632, pursuit: 660, endurance: 664 },
  { name: "M att W (COALITION)",         team: "Opponent", likelihood: 100, sprint: 884, punch: 842, climb: 673, tt: 633, pursuit: 662, endurance: 571 },
  { name: "Tom HAMLYN (COALITION)",      team: "Opponent", likelihood: 100, sprint: 787, punch: 759, climb: 687, tt: 638, pursuit: 727, endurance: 617 }
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

    clsBody.innerHTML += `
      <tr>
        <td><a href="${r.URL}" target="_blank">${r.Route}</a></td>
        <td>${r.Length} km</td>
        <td>${r.Elevation} m</td>
        <td>${r.Lead_in} km</td>

        <td>${r.avgCLS.toFixed(0)}</td>
        <td>${r.avgOpp.toFixed(0)}</td>
        <td class="${diffClass}">${r.diff.toFixed(0)}</td>

        ${weightCells(r)}
      </tr>
    `;
  });


  // -----------------------------
  // Best Opponent Routes
  // -----------------------------
  result.bestOpp.slice(0, 20).forEach(r => {
    const diffClass = r.diff >= 0 ? 'diff-positive' : 'diff-negative';

    oppBody.innerHTML += `
      <tr>
        <td><a href="${r.URL}" target="_blank">${r.Route}</a></td>
        <td>${r.Length} km</td>
        <td>${r.Elevation} m</td>
        <td>${r.Lead_in} km</td>

        <td>${r.avgCLS.toFixed(0)}</td>
        <td>${r.avgOpp.toFixed(0)}</td>
        <td class="${diffClass}">${r.diff.toFixed(0)}</td>

        ${weightCells(r)}
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
