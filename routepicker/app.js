//---------------------------------------------------------
// GLOBAL ROUTES VARIABLE
//---------------------------------------------------------
let routes = [];


//---------------------------------------------------------
// 1. Add Rider Row
//---------------------------------------------------------

function addRiderRow() {
  const container = document.getElementById('rider-container');

  const row = document.createElement('div');
  row.classList.add('rider-row');

  row.innerHTML = `
    <input type="text" class="rider-name" placeholder="Name">

    <select class="rider-team">
      <option value="A">Team A</option>
      <option value="B">Team B</option>
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

document.getElementById('add-rider-btn').onclick = addRiderRow;


//---------------------------------------------------------
// 2. Read Rider Inputs
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
// 3. Load Routes JSON
//---------------------------------------------------------

async function loadRoutes() {
  const response = await fetch('./routes.json');
  routes = await response.json();   // <-- FIXED
  return routes;
}


//---------------------------------------------------------
// 4. Compute Route Score
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
// 5. Rank Routes
//---------------------------------------------------------

function rankRoutes(routes, riders) {
  return routes
    .map(route => ({
      ...route,
      score: computeRouteScore(route, riders)
    }))
    .sort((a, b) => b.score - a.score);
}


//---------------------------------------------------------
// 6. Render Results
//---------------------------------------------------------

function renderResults(routes) {
  const bestBody = document.getElementById('best-routes');
  const worstBody = document.getElementById('worst-routes');

  bestBody.innerHTML = '';
  worstBody.innerHTML = '';

  // Top 10 best routes
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

  // Bottom 10 worst routes
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
// 7. Main Calculate Function
//---------------------------------------------------------

async function calculateRoutes() {
  const riders = getRiders();
  await loadRoutes();                 // <-- ensures global routes is populated
  const ranked = rankRoutes(routes, riders);
  renderResults(ranked);
}

document.getElementById('calculate-btn').onclick = calculateRoutes;
