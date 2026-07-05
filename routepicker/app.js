//---------------------------------------------------------
// GLOBAL ROUTES VARIABLE
//---------------------------------------------------------
let routes = [];


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

    <input type="number" class="rider-sprint" placeholder="Sprint">
    <input type="number" class="rider-punch" placeholder="Punch">
    <input type="number" class="rider-climb" placeholder="Climb">
    <input type="number" class="rider-pursuit" placeholder="Pursuit">
    <input type="number" class="rider-tt" placeholder="TT">
    <input type="number" class="rider-endurance" placeholder="Endurance">

    <button class="remove-rider">X</button>
  `;

  row.querySelector('.remove-rider').onclick = () => row.remove();

  container.appendChild(row);
}

document.getElementById('add-cls-btn').onclick = () => addRiderRow('cls-container');
document.getElementById('add-opp-btn').onclick = () => addRiderRow('opp-container');


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
// 3. Save Team to Local Storage
//---------------------------------------------------------

function saveTeam() {
  const riders = getRiders();
  localStorage.setItem('routepicker_team', JSON.stringify(riders));
  alert('Team saved!');
}

document.getElementById('save-team-btn').onclick = saveTeam;


//---------------------------------------------------------
// 4. Load Routes JSON
//---------------------------------------------------------

async function loadRoutes() {
  const response = await fetch('./routes.json');
  routes = await response.json();
  return routes;
}


//---------------------------------------------------------
// 5. Compute Route Score
//---------------------------------------------------------

function computeRouteScore(route, riders) {
  let score = 0;

  riders.forEach(r => {
    score +=
      r.sprint    * route.Sprint +
      r.punch     * route.Punch +
      r.climb     * route.Climb +
      r.pursuit   * route.Pursuit +
      r.tt        * route.TT +
      r.endurance * route.Endurance;
  });

  return score;
}


//---------------------------------------------------------
// 6. Rank Routes (with Ladder filter)
//---------------------------------------------------------

function rankRoutes(routes, riders) {

  const ladderOnly = document.getElementById('ladder-slider').checked;

  const filtered = ladderOnly
    ? routes.filter(r => r.Ladder === true)
    : routes;

  return filtered
    .map(route => ({
      ...route,
      score: computeRouteScore(route, riders)
    }))
    .sort((a, b) => b.score - a.score);
}


//---------------------------------------------------------
// 7. Render Results
//---------------------------------------------------------

function renderResults(routes) {
  const bestBody = document.getElementById('best-routes');
  const worstBody = document.getElementById('worst-routes');

  bestBody.innerHTML = '';
  worstBody.innerHTML = '';

  routes.slice(0, 10).forEach(r => {
    bestBody.innerHTML += `
      <tr>
        <td>${r.Route}</td>
        <td>${r.score.toFixed(2)}</td>
        <td>${r.Length}</td>
        <td>${r.Elevation}</td>
      </tr>
    `;
  });

  routes.slice(-10).forEach(r => {
    worstBody.innerHTML += `
      <tr>
        <td>${r.Route}</td>
        <td>${r.score.toFixed(2)}</td>
        <td>${r.Length}</td>
        <td>${r.Elevation}</td>
      </tr>
    `;
  });
}


//---------------------------------------------------------
// 8. Main Calculate Function
//---------------------------------------------------------

async function calculateRoutes() {
  await loadRoutes();
  const riders = getRiders();
  const ranked = rankRoutes(routes, riders);
  renderResults(ranked);
}

document.getElementById('calculate-btn').onclick = calculateRoutes;
