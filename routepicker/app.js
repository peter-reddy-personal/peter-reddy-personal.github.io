//---------------------------------------------------------
// GLOBAL ROUTES VARIABLE
//---------------------------------------------------------
let routes = [];


//---------------------------------------------------------
// DOMContentLoaded — ensures all buttons bind correctly
//---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {

  loadSavedTeam();

  // Ladder filter ON by default
  document.getElementById('ladder-slider').checked = true;

  // Bind Add Rider buttons
  document.getElementById('add-cls-btn').onclick = () => addRiderRow('cls-container');
  document.getElementById('add-opp-btn').onclick = () => addRiderRow('opp-container');

  // Bind Calculate
  document.getElementById('calculate-btn').onclick = calculateRoutes;

  // Bind remove + autosave + paste handler for DEFAULT riders
  document.querySelectorAll('.rider-row').forEach(row => {

    row.querySelector('.remove-rider').onclick = () => {
      row.remove();
      autoSaveTeam();
    };

    attachAutoSave(row);
    attachPasteHandler(row);
  });

});


//---------------------------------------------------------
// 1. Add Rider Row (CLS or Opponent)
//---------------------------------------------------------

function addRiderRow(sectionId) {
  const container = document.getElementById(sectionId);

  const row = document.createElement('div');
  row.classList.add('rider-row');

  row.innerHTML = `
    <input type="text" class="rider-name" placeholder="Name">

    <select class="rider-team">
      <option value="CLS">CLS</option>
      <option value="Opponent">Opponent</option>
    </select>

    <input type="number" class="rider-likelihood" placeholder="% Likelihood" value="100">

    <input type="number" class="rider-sprint" placeholder="Sprint">
    <input type="number" class="rider-punch" placeholder="Punch">
    <input type="number" class="rider-climb" placeholder="Climb">
    <input type="number" class="rider-pursuit" placeholder="Pursuit">
    <input type="number" class="rider-tt" placeholder="TT">
    <input type="number" class="rider-endurance" placeholder="Endurance">

    <button class="remove-rider">X</button>
  `;

  row.querySelector('.remove-rider').onclick = () => {
    row.remove();
    autoSaveTeam();
  };

  attachAutoSave(row);
  attachPasteHandler(row);

  container.appendChild(row);
  autoSaveTeam();
}


//---------------------------------------------------------
// 2. Read Rider Inputs (both sections)
//---------------------------------------------------------

function getRiders() {
  const rows = document.querySelectorAll('.rider-row');
  const riders = [];

  rows.forEach(row => {
    riders.push({
      name: row.querySelector('.rider-name').value,
      team: row.querySelector('.rider-team').value,
      likelihood: Number(row.querySelector('.rider-likelihood').value) || 0,
      sprint: Number(row.querySelector('.rider-sprint').value),
      punch: Number(row.querySelector('.rider-punch').value),
      climb: Number(row.querySelector('.rider-climb').value),
      pursuit: Number(row.querySelector('.rider-pursuit').value),
      tt: Number(row.querySelector('.rider-tt').value),
      endurance: Number(row.querySelector('.rider-endurance').value)
    });
  });

  return riders;
}


//---------------------------------------------------------
// 3. Auto-save Team to Local Storage
//---------------------------------------------------------

function autoSaveTeam() {
  const riders = getRiders();
  localStorage.setItem('routepicker_team', JSON.stringify(riders));
}

function attachAutoSave(row) {
  row.querySelectorAll('input, select').forEach(el => {
    el.oninput = autoSaveTeam;
  });
}


//---------------------------------------------------------
// 4. Multi-line paste handler (fills all 6 stats)
//---------------------------------------------------------

function attachPasteHandler(row) {

  const fields = [
    row.querySelector('.rider-sprint'),
    row.querySelector('.rider-punch'),
    row.querySelector('.rider-climb'),
    row.querySelector('.rider-pursuit'),
    row.querySelector('.rider-tt'),
    row.querySelector('.rider-endurance')
  ];

  fields.forEach(field => {
    field.addEventListener('paste', (event) => {
      event.preventDefault();

      const text = event.clipboardData.getData('text');
      const lines = text.trim().split(/\s+/);

      if (lines.length !== 6) {
        field.value = text; // normal paste fallback
        autoSaveTeam();
        return;
      }

      const nums = lines.map(n => Number(n));

      fields[0].value = nums[0];
      fields[1].value = nums[1];
      fields[2].value = nums[2];
      fields[3].value = nums[3];
      fields[4].value = nums[4];
      fields[5].value = nums[5];

      autoSaveTeam();
    });
  });
}


//---------------------------------------------------------
// 5. Load Saved Team on Page Load
//---------------------------------------------------------

function loadSavedTeam() {
  const saved = localStorage.getItem('routepicker_team');
  if (!saved) return;

  const riders = JSON.parse(saved);

  document.getElementById('cls-container').innerHTML = '';
  document.getElementById('opp-container').innerHTML = '';

  riders.forEach(r => {
    const sectionId = r.team === 'CLS' ? 'cls-container' : 'opp-container';
    const container = document.getElementById(sectionId);

    const row = document.createElement('div');
    row.classList.add('rider-row');

    row.innerHTML = `
      <input type="text" class="rider-name" value="${r.name}">
      <select class="rider-team">
        <option value="CLS" ${r.team === 'CLS' ? 'selected' : ''}>CLS</option>
        <option value="Opponent" ${r.team === 'Opponent' ? 'selected' : ''}>Opponent</option>
      </select>

      <input type="number" class="rider-likelihood" value="${r.likelihood}">

      <input type="number" class="rider-sprint" value="${r.sprint}">
      <input type="number" class="rider-punch" value="${r.punch}">
      <input type="number" class="rider-climb" value="${r.climb}">
      <input type="number" class="rider-pursuit" value="${r.pursuit}">
      <input type="number" class="rider-tt" value="${r.tt}">
      <input type="number" class="rider-endurance" value="${r.endurance}">
      <button class="remove-rider">X</button>
    `;

    row.querySelector('.remove-rider').onclick = () => {
      row.remove();
      autoSaveTeam();
    };

    attachAutoSave(row);
    attachPasteHandler(row);

    container.appendChild(row);
  });
}


//---------------------------------------------------------
// 6. Load Routes JSON
//---------------------------------------------------------

async function loadRoutes() {
  const response = await fetch('./routes.json');
  routes = await response.json();
  return routes;
}


//---------------------------------------------------------
// 7. Compute vELO Score for a single rider
//---------------------------------------------------------

function computeSingleScore(route, r) {
  return (
    r.sprint    * route.Sprint +
    r.punch     * route.Punch +
    r.climb     * route.Climb +
    r.pursuit   * route.Pursuit +
    r.tt        * route.TT +
    r.endurance * route.Endurance
  );
}


//---------------------------------------------------------
// 8. Weighted CLS / Opponent averages + difference
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
// 9. Rank Routes separately for CLS and Opponent
//---------------------------------------------------------

function rankRoutes(routes, riders) {

  const ladderOnly = document.getElementById('ladder-slider').checked;

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

  return {
    bestCLS: scored.sort((a, b) => b.avgCLS - a.avgCLS),
    bestOpp: scored.sort((a, b) => b.avgOpp - a.avgOpp)
  };
}


//---------------------------------------------------------
// 10. Render Results
//---------------------------------------------------------

function renderResults(result) {

  const clsBody = document.getElementById('best-routes');
  const oppBody = document.getElementById('worst-routes');

  clsBody.innerHTML = '';
  oppBody.innerHTML = '';

  // Best CLS routes
  result.bestCLS.slice(0, 10).forEach(r => {
    clsBody.innerHTML += `
      <tr>
        <td>${r.Route}</td>
        <td>${r.Length}</td>
        <td>${r.Elevation}</td>
        <td>${r.LeadIn}</td>
        <td>${r.avgCLS.toFixed(2)}</td>
        <td>${r.avgOpp.toFixed(2)}</td>
        <td>${r.diff.toFixed(2)}</td>
      </tr>
    `;
  });

  // Best Opponent routes
  result.bestOpp.slice(0, 10).forEach(r => {
    oppBody.innerHTML += `
      <tr>
        <td>${r.Route}</td>
        <td>${r.Length}</td>
        <td>${r.Elevation}</td>
        <td>${r.LeadIn}</td>
        <td>${r.avgOpp.toFixed(2)}</td>
        <td>${r.avgCLS.toFixed(2)}</td>
        <td>${r.diff.toFixed(2)}</td>
      </tr>
    `;
  });
}


//---------------------------------------------------------
// 11. Main Calculate Function
//---------------------------------------------------------

async function calculateRoutes() {
  await loadRoutes();
  const riders = getRiders();
  const ranked = rankRoutes(routes, riders);
  renderResults(ranked);
}
