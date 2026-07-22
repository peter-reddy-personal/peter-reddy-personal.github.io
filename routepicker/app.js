//---------------------------------------------------------
// VERSION BANNER
//---------------------------------------------------------
const jsVersion = "2026‑07‑21 18:15";

window.addEventListener("DOMContentLoaded", () => {
  const banner = document.getElementById("version-banner");
  if (banner) {
    banner.textContent = `Zwift Ladder Route Picker — JS build: ${jsVersion}`;
  }
});


//---------------------------------------------------------
// MAIN APP INITIALISATION
//---------------------------------------------------------
window.addEventListener("DOMContentLoaded", async () => {

  initCollapsibles();

  // Show loading message
  document.getElementById("cls-table").innerHTML =
    `<div class="loading-msg">Loading CLS riders…</div>`;

  // Load teams + opponent dropdown
  await loadTeams();
  populateOpponentDropdown();

  // Restore saved state (CLS + Opponent riders)
  loadState();

  // Restore saved opponent team selection
  const savedOppTeam = localStorage.getItem("selectedOpponentTeam");
  if (savedOppTeam) {
    document.getElementById("opponentSelect").value = savedOppTeam;
  }

  // Render CLS riders (fresh or restored)
  if (clsRiders.length === 0) {
    await renderCLS();
  } else {
    renderUnifiedCLSTable(clsRiders);
  }

  // Render opponent riders (fresh or restored)
  if (savedOppTeam && opponentRiders.length > 0) {
    renderUnifiedOpponentTable(opponentRiders);
  } else if (savedOppTeam) {
    await onOpponentSelected();   // loads full team
  }

  // Load routes
  const resRoutes = await fetch("routes.json");
  routes = await resRoutes.json();

  // Opponent team selection handler
  document.getElementById("opponentSelect")
    .addEventListener("change", () => {
      onOpponentSelected();   // this already calls calculateRoutes()
      saveState();
    });

  // Ladder toggle → recalc
  document.getElementById("ladder-toggle")
    .addEventListener("change", calculateRoutes);

  // -----------------------------------------------------
  // IMPORTANT: run initial calculation BEFORE attaching slider listener
  // -----------------------------------------------------
  calculateRoutes();

  // -----------------------------------------------------
  // Randomness slider handler (attach AFTER DOM is fully rendered)
  // -----------------------------------------------------
  const randomnessSlider = document.getElementById("randomness-slider");
  const randomnessValue = document.getElementById("randomness-value");

  if (randomnessSlider) {
    randomnessSlider.addEventListener("input", () => {
      randomnessValue.textContent = `${randomnessSlider.value}%`;
      calculateRoutes();
    });
  }
});



  // ---------------------------------------------------------
  // REMOVE RIDER (works for both CLS and Opponent tables)
  // ---------------------------------------------------------
  document.addEventListener("click", e => {
    if (!e.target.classList.contains("remove-rider")) return;

    const factorRow = e.target.closest(".rider-row");
    const powerRow = factorRow.nextElementSibling;

    const team = factorRow.dataset.team;   // "cls" or "opp"
    const id = factorRow.dataset.id;       // rider id as string

    if (team === "cls") {
      clsRiders = clsRiders.filter(r => String(r.id) !== id);
    } else if (team === "opp") {
      opponentRiders = opponentRiders.filter(r => String(r.id) !== id);
    }

    if (powerRow && powerRow.classList.contains("power-mode")) {
      powerRow.remove();
    }
    factorRow.remove();

    // Re-render tables
    renderUnifiedCLSTable(clsRiders);
    renderUnifiedOpponentTable(opponentRiders);

    // Save new state
    saveState();

    // Recalculate team averages
    riders = [...clsRiders, ...opponentRiders];
    calculateRoutes();
  });

  // Reset CLS button
  document.getElementById("reset-cls").addEventListener("click", () => {
    renderCLS();
    saveState();
  });

  // Reset opponent button
  document.getElementById("reset-opp").addEventListener("click", () => {
    onOpponentSelected();
    saveState();
  });

  // Unified power toggle handler
  document.querySelectorAll(".power-toggle").forEach(t => {
    t.addEventListener("change", () => {
      const checked = t.checked;

      // Sync all toggles
      document.querySelectorAll(".power-toggle").forEach(x => x.checked = checked);

      // Re-render both tables
      renderUnifiedCLSTable(clsRiders);
      renderUnifiedOpponentTable(opponentRiders);

      saveState();
    });
  });

  // Route collapse handler
  document.addEventListener("click", e => {
    const row = e.target.closest(".route-row");
    if (!row) return;

    const collapseRow = row.nextElementSibling;
    if (!collapseRow || !collapseRow.classList.contains("collapse-row")) return;

    const isOpen = collapseRow.style.display !== "none";
    collapseRow.style.display = isOpen ? "none" : "table-row";

    if (!isOpen) {
      const img = collapseRow.querySelector(".elevation-img");
      if (!img) {
        console.warn("No .elevation-img found in collapse row");
        return;
      }

      const worldRaw = row.dataset.world || "";
      const routeRaw = row.dataset.route || "";

      const world = slugify(worldRaw);
      const cleanedRoute = cleanRouteName(routeRaw);
      const route = slugify(cleanedRoute);

      const url = `https://zwiftinsider.com/wp-content/routes/${world}/${route}.svg`;
      console.log("Elevation URL:", url);

      img.src = url;
    }
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
// SAVE / LOAD STATE (localStorage)
// ---------------------------------------------------------
function saveState() {
  localStorage.setItem("clsRiders", JSON.stringify(clsRiders));
  localStorage.setItem("opponentRiders", JSON.stringify(opponentRiders));
}

function loadState() {
  const savedCLS = JSON.parse(localStorage.getItem("clsRiders") || "[]");
  const savedOpp = JSON.parse(localStorage.getItem("opponentRiders") || "[]");

  clsRiders = savedCLS;
  opponentRiders = savedOpp;
}


// ---------------------------------------------------------
// UNIVERSAL COLLAPSIBLE HANDLER
// ---------------------------------------------------------
function initCollapsibles() {
  document.querySelectorAll(".collapsible").forEach(section => {
    const header = section.querySelector(".collapsible-header");
    const chevron = section.querySelector(".chevron");
    const targetId = section.dataset.target;
    const content = document.getElementById(targetId);

    header.addEventListener("click", () => {
      const isOpen = content.style.display === "block";
      content.style.display = isOpen ? "none" : "block";
      chevron.textContent = isOpen ? "▼" : "▲";
    });
  });
}


// ---------------------------------------------------------
// FETCH ZWIFTRACING DATA FOR A RIDER
// ---------------------------------------------------------
async function fetchZwiftRacingRider(riderId) {
  console.log("Fetching ZR via Worker for:", riderId);

  const url = `https://zwiftracingappdata.peter-reddy95.workers.dev/${riderId}`;
  const res = await fetch(url);

  if (!res.ok) {
    console.warn("Worker fetch failed:", res.status);
    return { error: true };
  }

  const data = await res.json();
  const rider = data?.props?.pageProps?.rider;

  if (!rider) {
    console.warn("No rider object found in Worker JSON");
    return { error: true };
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
  const div = document.getElementById("cls-table");

  // Show loading message immediately
  div.innerHTML = `<div class="loading-msg">Loading CLS riders…</div>`;

  // Allow browser to paint the loading message
  await Promise.resolve();

  console.log("Rendering CLS...");
  console.log("clsTeam:", clsTeam);

  if (!clsTeam) {
    console.error("CLS team not found — cannot render.");
    return;
  }

  // Load + enrich riders (async)
  clsRiders = await enrichTeam(clsTeam);
  console.log("CLS enriched:", clsRiders);

  // Replace loading message with the real table
  renderUnifiedCLSTable(clsRiders);
}

// ---------------------------------------------------------
// Trim rider name to 26 char
// ---------------------------------------------------------
function trimName(name, max = 26) {
  return name.length > max ? name.slice(0, max) + "…" : name;
}

// ---------------------------------------------------------
// Clean route name (remove leading "2x ", "3x ", etc.)
// ---------------------------------------------------------
function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanRouteName(name) {
  // Remove leading "2x ", "3x ", etc.
  return String(name).replace(/^\d+x\s+/i, "");
}

// ---------------------------------------------------------
// POPULATE OPPONENT DROPDOWN (alphabetical)
// ---------------------------------------------------------
function populateOpponentDropdown() {
  console.log("Populating opponent dropdown...");
  console.log("Teams available:", allTeams.length);

  const select = document.getElementById("opponentSelect");

  // Sort teams alphabetically by name
  const sortedTeams = [...allTeams]
    .filter(team => team.number !== 63)   // remove CLS
    .sort((a, b) => a.name.localeCompare(b.name));

  // Populate dropdown
  sortedTeams.forEach(team => {
    const opt = document.createElement("option");
    opt.value = team.number;
    opt.textContent = team.name;
    select.appendChild(opt);
  });

  console.log("Dropdown populated.");
}

// ---------------------------------------------------------
// LOAD + RENDER OPPONENT TEAM (only when selected)
// ---------------------------------------------------------
async function onOpponentSelected() {
  const div = document.getElementById("opp-table");
  const select = document.getElementById("opponentSelect");
  const teamNumber = parseInt(select.value, 10);

  // No team selected → clear table
  if (!teamNumber) {
    div.innerHTML = `<div class="loading-msg">No opponent team selected.</div>`;
    return;
  }

  // Save selected team number
  localStorage.setItem("selectedOpponentTeam", teamNumber);

  // Show loading message
  div.innerHTML = `<div class="loading-msg">Loading opponent riders…</div>`;
  await Promise.resolve(); // allow browser to paint

  // Find team
  const opponentTeam = allTeams.find(t => t.number === teamNumber);
  if (!opponentTeam) {
    div.innerHTML = `<div class="loading-msg">Opponent team not found.</div>`;
    return;
  }

  // Fetch + enrich riders
  opponentRiders = await enrichTeam(opponentTeam);

  // Render table
  renderUnifiedOpponentTable(opponentRiders);

  // Update averages (CLS + Opp combined)
  const allRiders = getRiders();
  renderAverages(allRiders);
  renderBeeswarm(clsRiders, opponentRiders);
}

// ---------------------------------------------------------
// GET POWER DISTRIBUTIONS FOR CLS AND OPPONENT RIDERS
// ---------------------------------------------------------
function getPowerDistributions(clsRiders, oppRiders) {
  const durations = [
    { key: "wkg15",  label: "15s" },
    { key: "wkg30",  label: "30s" },
    { key: "wkg60",  label: "1m" },
    { key: "wkg120", label: "2m" },
    { key: "wkg300", label: "5m" },
    { key: "wkg1200", label: "20m" }
  ];

  function extract(riders) {
    return durations.map(d => ({
      label: d.label,
      values: riders
        .map(r => r.zr?.power?.[d.key]?.[0])
        .filter(v => typeof v === "number")
    }));
  }

  return {
    cls: extract(clsRiders),
    opp: extract(oppRiders),
    durations
  };
}

// ---------------------------------------------------------
// RENDER BEESWARM CHART FOR POWER DISTRIBUTIONS
// ---------------------------------------------------------
function renderBeeswarm(clsRiders, oppRiders) {
  const durations = [
    { key: "wkg15",  label: "15s" },
    { key: "wkg30",  label: "30s" },
    { key: "wkg60",  label: "1m" },
    { key: "wkg120", label: "2m" },
    { key: "wkg300", label: "5m" },
    { key: "wkg1200", label: "20m" }
  ];

  // Extract power values
  function extract(riders) {
    return durations.map(d => ({
      label: d.label,
      values: riders
        .map(r => ({
          name: r.name,
          value: r.zr?.power?.[d.key]?.[0]
        }))
        .filter(v => typeof v.value === "number")
    }));
  }

  const cls = extract(clsRiders);
  const opp = extract(oppRiders);

  // Jitter function to avoid overlap
  function jitter() {
    return (Math.random() - 0.5) * 0.12;   // ±0.06 jitter
  }


  // Build scatter dataset
  function buildDataset(teamData, color, offset) {
  const points = [];
  teamData.forEach((d, i) => {
    d.values.forEach(v => {
      points.push({
        x: i + offset + jitter(),   // small jitter
        y: v.value,
        rider: v.name
      });
    });
  });
  return {
    label: color.label,
    data: points,
    backgroundColor: color.bg,
    borderColor: color.border,
    pointRadius: 6,
    pointHoverRadius: 8
  };
}

  const datasets = [
  buildDataset(cls, { label: "CLS", bg: "rgba(80,160,255,0.7)", border: "#4a90e2" }, -0.10),
  buildDataset(opp, { label: "Opponent", bg: "rgba(255,120,120,0.7)", border: "#e25a5a" }, +0.10)
];


  const ctx = document.getElementById("powerBeeswarm").getContext("2d");

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
            label: ctx => `${ctx.raw.rider}: ${ctx.raw.y.toFixed(1)} w/kg`
          }
        },
        legend: { display: false }
      },
      scales: {
        x: {
          min: -0.5,
          max: durations.length - 0.5,
          ticks: {
            callback: i => durations[i]?.label ?? ""
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


// ---------------------------------------------------------
// RENDER UNIFIED CLS TABLE
// ---------------------------------------------------------

function renderUnifiedCLSTable(riders) {
  const toggle = document.querySelector(".power-toggle");
  const showPower = toggle ? toggle.checked : false;

  function lerpColor(min, max, value) {
    if (
      value === "N/A" ||
      value === undefined ||
      value === null ||
      !isFinite(min) ||
      !isFinite(max) ||
      min === max
    ) {
      return "#f3f3f3";
    }

    const t = (value - min) / (max - min);

    const start = { r: 220, g: 250, b: 230 };
    const end   = { r: 255, g: 225, b: 225 };

    const r = Math.round(start.r + (end.r - start.r) * t);
    const g = Math.round(start.g + (end.g - start.g) * t);
    const b = Math.round(start.b + (end.b - start.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  const powerStats = ["wkg5", "wkg15", "wkg30", "wkg60", "wkg120", "wkg300", "wkg1200"];
  const columnMin = {};
  const columnMax = {};

  powerStats.forEach(stat => {
    const values = riders
      .map(r => r.zr?.power?.[stat]?.[0])
      .filter(v => typeof v === "number");

    columnMin[stat] = values.length ? Math.min(...values) : NaN;
    columnMax[stat] = values.length ? Math.max(...values) : NaN;
  });

  const div = document.getElementById("cls-table");
  div.innerHTML = "";

  const factorHeader = document.createElement("div");
  factorHeader.className = "input-headings factors-mode factors-grid";
  factorHeader.innerHTML = `
    <div>Name</div>
    <div>SPR</div>
    <div>PUN</div>
    <div>CLI</div>
    <div>TT</div>
    <div>PUR</div>
    <div>END</div>
    <div></div>
  `;

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
    <div></div>
  `;

  div.appendChild(factorHeader);
  div.appendChild(powerHeader);

  riders.forEach(r => {
    const zr = r.zr || {};
    const factors = zr.velo?.factors || {};
    const power = zr.power || {};

    // FACTOR ROW
    const factorRow = document.createElement("div");
    factorRow.className = "rider-row factors-mode factors-grid";
    factorRow.dataset.team = "cls";
    factorRow.dataset.id = String(r.id);
    factorRow.innerHTML = `
      <a href="https://zwiftracing.app/riders/${r.id}" target="_blank" class="rider-link">${trimName(r.name)}</a>
      <input class="rider-sprint" value="${Math.round(factors.sprint || 0)}">
      <input class="rider-punch" value="${Math.round(factors.punch || 0)}">
      <input class="rider-climb" value="${Math.round(factors.climb || 0)}">
      <input class="rider-tt" value="${Math.round(factors.timeTrial || 0)}">
      <input class="rider-pursuit" value="${Math.round(factors.pursuit || 0)}">
      <input class="rider-endurance" value="${Math.round(factors.endurance || 0)}">
      <button class="remove-rider">Remove</button>
    `;

    // POWER ROW
    const v5    = power.wkg5?.[0];
    const v15   = power.wkg15?.[0];
    const v30   = power.wkg30?.[0];
    const v60   = power.wkg60?.[0];
    const v120  = power.wkg120?.[0];
    const v300  = power.wkg300?.[0];
    const v1200 = power.wkg1200?.[0];

    const powerRow = document.createElement("div");
    powerRow.className = "rider-row power-mode power-grid";
    powerRow.dataset.team = "cls";
    powerRow.dataset.id = String(r.id);
    powerRow.innerHTML = `
      <a href="https://zwiftracing.app/riders/${r.id}" target="_blank" class="rider-link">${trimName(r.name)}</a>

      <div class="profile-cell weight">${Math.round(zr.weight) ?? "N/A"}</div>
      <div class="profile-cell phenotype">${zr.phenotype?.value ?? "Unknown"}</div>

      <div class="profile-cell wkg5"   style="background:${lerpColor(columnMin.wkg5,   columnMax.wkg5,   v5)};">${v5?.toFixed(1) ?? "N/A"}</div>
      <div class="profile-cell wkg15"  style="background:${lerpColor(columnMin.wkg15,  columnMax.wkg15,  v15)};">${v15?.toFixed(1) ?? "N/A"}</div>
      <div class="profile-cell wkg30"  style="background:${lerpColor(columnMin.wkg30,  columnMax.wkg30,  v30)};">${v30?.toFixed(1) ?? "N/A"}</div>
      <div class="profile-cell wkg60"  style="background:${lerpColor(columnMin.wkg60,  columnMax.wkg60,  v60)};">${v60?.toFixed(1) ?? "N/A"}</div>
      <div class="profile-cell wkg120" style="background:${lerpColor(columnMin.wkg120, columnMax.wkg120, v120)};">${v120?.toFixed(1) ?? "N/A"}</div>
      <div class="profile-cell wkg300" style="background:${lerpColor(columnMin.wkg300, columnMax.wkg300, v300)};">${v300?.toFixed(1) ?? "N/A"}</div>
      <div class="profile-cell wkg1200" style="background:${lerpColor(columnMin.wkg1200, columnMax.wkg1200, v1200)};">${v1200?.toFixed(1) ?? "N/A"}</div>

      <button class="remove-rider">Remove</button>
    `;

    div.appendChild(factorRow);
    div.appendChild(powerRow);
  });

  document.querySelectorAll(".factors-mode").forEach(el => {
    el.style.display = showPower ? "none" : "grid";
  });
  document.querySelectorAll(".power-mode").forEach(el => {
    el.style.display = showPower ? "grid" : "none";
  });
}


// ---------------------------------------------------------
// RENDER UNIFIED Opponent TABLE
// ---------------------------------------------------------

function renderUnifiedOpponentTable(riders) {
  const toggle = document.querySelector(".power-toggle");
  const showPower = toggle ? toggle.checked : false;

  function lerpColor(min, max, value) {
    if (
      value === "N/A" ||
      value === undefined ||
      value === null ||
      !isFinite(min) ||
      !isFinite(max) ||
      min === max
    ) {
      return "#f3f3f3";
    }

    const t = (value - min) / (max - min);

    const start = { r: 220, g: 250, b: 230 };
    const end   = { r: 255, g: 225, b: 225 };

    const r = Math.round(start.r + (end.r - start.r) * t);
    const g = Math.round(start.g + (end.g - start.g) * t);
    const b = Math.round(start.b + (end.b - start.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  const powerStats = ["wkg5", "wkg15", "wkg30", "wkg60", "wkg120", "wkg300", "wkg1200"];
  const columnMin = {};
  const columnMax = {};

  powerStats.forEach(stat => {
    const values = riders
      .map(r => r.zr?.power?.[stat]?.[0])
      .filter(v => typeof v === "number");

    columnMin[stat] = values.length ? Math.min(...values) : NaN;
    columnMax[stat] = values.length ? Math.max(...values) : NaN;
  });

  const div = document.getElementById("opp-table");
  div.innerHTML = "";

  const factorHeader = document.createElement("div");
  factorHeader.className = "input-headings factors-mode factors-grid";
  factorHeader.innerHTML = `
    <div>Name</div>
    <div>SPR</div>
    <div>PUN</div>
    <div>CLI</div>
    <div>TT</div>
    <div>PUR</div>
    <div>END</div>
    <div></div>
  `;

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
    <div></div>
  `;

  div.appendChild(factorHeader);
  div.appendChild(powerHeader);

  riders.forEach(r => {
    const zr = r.zr || {};
    const factors = zr.velo?.factors || {};
    const power = zr.power || {};

    // FACTOR ROW
    const factorRow = document.createElement("div");
    factorRow.className = "rider-row factors-mode factors-grid";
    factorRow.dataset.team = "opp";
    factorRow.dataset.id = String(r.id);
    factorRow.innerHTML = `
      <a href="https://zwiftracing.app/riders/${r.id}" target="_blank" class="rider-link">${trimName(r.name)}</a>
      <input class="rider-sprint" value="${Math.round(factors.sprint || 0)}">
      <input class="rider-punch" value="${Math.round(factors.punch || 0)}">
      <input class="rider-climb" value="${Math.round(factors.climb || 0)}">
      <input class="rider-tt" value="${Math.round(factors.timeTrial || 0)}">
      <input class="rider-pursuit" value="${Math.round(factors.pursuit || 0)}">
      <input class="rider-endurance" value="${Math.round(factors.endurance || 0)}">
      <button class="remove-rider">Remove</button>
    `;

    // POWER ROW
    const v5    = power.wkg5?.[0];
    const v15   = power.wkg15?.[0];
    const v30   = power.wkg30?.[0];
    const v60   = power.wkg60?.[0];
    const v120  = power.wkg120?.[0];
    const v300  = power.wkg300?.[0];
    const v1200 = power.wkg1200?.[0];

    const powerRow = document.createElement("div");
    powerRow.className = "rider-row power-mode power-grid";
    powerRow.dataset.team = "opp";
    powerRow.dataset.id = String(r.id);
    powerRow.innerHTML = `
      <a href="https://zwiftracing.app/riders/${r.id}" target="_blank" class="rider-link">${trimName(r.name)}</a>

      <div class="profile-cell weight">${Math.round(zr.weight) ?? "N/A"}</div>
      <div class="profile-cell phenotype">${zr.phenotype?.value ?? "Unknown"}</div>

      <div class="profile-cell wkg5"   style="background:${lerpColor(columnMin.wkg5,   columnMax.wkg5,   v5)};">${v5?.toFixed(1) ?? "N/A"}</div>
      <div class="profile-cell wkg15"  style="background:${lerpColor(columnMin.wkg15,  columnMax.wkg15,  v15)};">${v15?.toFixed(1) ?? "N/A"}</div>
      <div class="profile-cell wkg30"  style="background:${lerpColor(columnMin.wkg30,  columnMax.wkg30,  v30)};">${v30?.toFixed(1) ?? "N/A"}</div>
      <div class="profile-cell wkg60"  style="background:${lerpColor(columnMin.wkg60,  columnMax.wkg60,  v60)};">${v60?.toFixed(1) ?? "N/A"}</div>
      <div class="profile-cell wkg120" style="background:${lerpColor(columnMin.wkg120, columnMax.wkg120, v120)};">${v120?.toFixed(1) ?? "N/A"}</div>
      <div class="profile-cell wkg300" style="background:${lerpColor(columnMin.wkg300, columnMax.wkg300, v300)};">${v300?.toFixed(1) ?? "N/A"}</div>
      <div class="profile-cell wkg1200" style="background:${lerpColor(columnMin.wkg1200, columnMax.wkg1200, v1200)};">${v1200?.toFixed(1) ?? "N/A"}</div>

      <button class="remove-rider">Remove</button>
    `;

    div.appendChild(factorRow);
    div.appendChild(powerRow);
  });

  document.querySelectorAll(".factors-mode").forEach(el => {
    el.style.display = showPower ? "none" : "grid";
  });
  document.querySelectorAll(".power-mode").forEach(el => {
    el.style.display = showPower ? "grid" : "none";
  });
}


//---------------------------------------------------------
// Read Rider Inputs
//---------------------------------------------------------
function getRiders() {
  const rows = document.querySelectorAll('.rider-row');
  const riders = [];

  rows.forEach(row => {
    // Only read FACTOR MODE rows (correct)
    if (!row.classList.contains("power-mode")) {

      const parentId = row.parentElement.id;
      const team = parentId === "cls-table" ? "CLS" : "Opponent";

      riders.push({
        team: team,

        // Checkbox selection (default true)
        selected: row.querySelector('.rider-select')?.checked ?? true,

        // Name from link text (since name is not an <input>)
        name: row.querySelector('.rider-link')?.textContent.trim() || "",

        // Factor values
        sprint: Number(row.querySelector('.rider-sprint')?.value) || 0,
        punch: Number(row.querySelector('.rider-punch')?.value) || 0,
        climb: Number(row.querySelector('.rider-climb')?.value) || 0,
        tt: Number(row.querySelector('.rider-tt')?.value) || 0,
        pursuit: Number(row.querySelector('.rider-pursuit')?.value) || 0,
        endurance: Number(row.querySelector('.rider-endurance')?.value) || 0
      });
    }
  });

  return riders;
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
        return;
      }

      const nums = lines.map(n => Number(n));

      fields[0].value = nums[0];
      fields[1].value = nums[1];
      fields[2].value = nums[2];
      fields[3].value = nums[3]; // TT
      fields[4].value = nums[4]; // PUR
      fields[5].value = nums[5];
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

  // Split into teams
  const cls = riders.filter(r => r.team === 'CLS' && r.selected !== false);
  const opp = riders.filter(r => r.team === 'Opponent' && r.selected !== false);

  function avgScore(team) {
    if (team.length === 0) return 0;

    const total = team.reduce((sum, r) => {
      return sum + computeSingleScore(route, r);
    }, 0);

    return total / team.length;
  }

  const avgCLS = avgScore(cls);
  const avgOpp = avgScore(opp);

  return {
    avgCLS,
    avgOpp,
    diff: avgCLS - avgOpp
  };
}


//---------------------------------------------------------
// Rank Routes (with controlled randomness)
//---------------------------------------------------------
function rankRoutes(routes, riders) {
  const powerToggle = document.getElementById("power-toggle");
  const showPower = powerToggle?.checked ?? false;

  const ladderToggle = document.getElementById("ladder-toggle");
  const ladderOnly = ladderToggle?.checked ?? false;

  const filtered = ladderOnly
    ? routes.filter(r => r.Ladder === true)
    : routes;

  const scored = filtered.map(route => {
    const scores = computeRouteScores(route, riders);

    const randomnessSlider = document.getElementById("randomness-slider");
    const randomness = randomnessSlider ? Number(randomnessSlider.value) : 50;

    const jitterStrength = Math.pow(randomness / 100, 2) * 100;
    const jitter = (Math.random() - 0.5) * jitterStrength;

    return {
      ...route,

      // deterministic values (shown in UI)
      avgCLS: scores.avgCLS,
      avgOpp: scores.avgOpp,
      diff: scores.diff,

      // jittered value (used ONLY for ranking)
      jitteredDiff: scores.diff + jitter
    };
  });

  const bestCLS = [...scored].sort((a, b) => b.jitteredDiff - a.jitteredDiff);
  const bestOpp = [...scored].sort((a, b) => a.jitteredDiff - b.jitteredDiff);

  return { bestCLS, bestOpp };
}


//---------------------------------------------------------
// Render Team Averages with gradient differences
//---------------------------------------------------------
function renderAverages(riders) {
  // Only include selected riders
  const cls = riders.filter(r => r.team === "CLS" && r.selected !== false);
  const opp = riders.filter(r => r.team === "Opponent" && r.selected !== false);

  function avg(team, key) {
    if (team.length === 0) return 0;

    const total = team.reduce((sum, r) => {
      return sum + (r[key] || 0);
    }, 0);

    return total / team.length;
  }

  const clsAvg = {
    sprint:    avg(cls, "sprint"),
    punch:     avg(cls, "punch"),
    climb:     avg(cls, "climb"),
    tt:        avg(cls, "tt"),
    pursuit:   avg(cls, "pursuit"),
    endurance: avg(cls, "endurance")
  };

  const oppAvg = {
    sprint:    avg(opp, "sprint"),
    punch:     avg(opp, "punch"),
    climb:     avg(opp, "climb"),
    tt:        avg(opp, "tt"),
    pursuit:   avg(opp, "pursuit"),
    endurance: avg(opp, "endurance")
  };

  const diff = {
    sprint:    clsAvg.sprint    - oppAvg.sprint,
    punch:     clsAvg.punch     - oppAvg.punch,
    climb:     clsAvg.climb     - oppAvg.climb,
    tt:        clsAvg.tt        - oppAvg.tt,
    pursuit:   clsAvg.pursuit   - oppAvg.pursuit,
    endurance: clsAvg.endurance - oppAvg.endurance
  };

  const values = Object.values(diff);
  const min = Math.min(...values);
  const max = Math.max(...values);

  function gradientStyle(value) {
  if (value === 0) {
    return `background-color: rgb(235, 235, 235);`;
  }

  const stops = [
    { limit: 15,  pos: "rgb(235, 255, 235)", neg: "rgb(255, 235, 235)" },
    { limit: 30,  pos: "rgb(225, 250, 225)", neg: "rgb(250, 225, 225)" },
    { limit: 50,  pos: "rgb(215, 245, 215)", neg: "rgb(245, 215, 215)" },
    { limit: 75,  pos: "rgb(205, 240, 205)", neg: "rgb(240, 205, 205)" },
    { limit: 100, pos: "rgb(195, 235, 195)", neg: "rgb(235, 195, 195)" },
    { limit: 150, pos: "rgb(185, 230, 185)", neg: "rgb(230, 185, 185)" },
    { limit: 200, pos: "rgb(175, 225, 175)", neg: "rgb(225, 175, 175)" },
    { limit: 250, pos: "rgb(165, 220, 165)", neg: "rgb(220, 165, 165)" }
  ];

  const abs = Math.abs(value);

  for (const stop of stops) {
    if (abs <= stop.limit) {
      return `background-color: ${value > 0 ? stop.pos : stop.neg};`;
    }
  }

  // Beyond 250 → strongest pastel
  return `background-color: ${value > 0 ? "rgb(155, 215, 155)" : "rgb(215, 155, 155)"};`;
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
// Render Route Results (Type column instead of weight columns)
//---------------------------------------------------------
function renderResults(result) {

  const clsBody = document.getElementById('best-routes');
  const oppBody = document.getElementById('worst-routes');

  clsBody.innerHTML = '';
  oppBody.innerHTML = '';

  // -----------------------------
  // Best CLS Routes
  // -----------------------------
  result.bestCLS.slice(0, 20).forEach(r => {
    const diffClass = r.diff >= 0 ? 'diff-positive' : 'diff-negative';

    clsBody.innerHTML += `
  <tr class="route-row" data-route="${r.Route}" data-world="${r.World}">
    <td>
      <a href="${r.URL}" target="_blank" class="route-link">${r.Route}</a>
    </td>

    <td>${r.Type}</td>
    <td>${r.Length} km</td>
    <td>${r.Elevation} m</td>
    <td>${r.Lead_in} km</td>

    <td>${r.avgCLS.toFixed(0)}</td>
    <td>${r.avgOpp.toFixed(0)}</td>
    <td class="${diffClass}">${r.diff.toFixed(0)}</td>
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

    <td>${r.Type}</td>
    <td>${r.Length} km</td>
    <td>${r.Elevation} m</td>
    <td>${r.Lead_in} km</td>

    <td>${r.avgCLS.toFixed(0)}</td>
    <td>${r.avgOpp.toFixed(0)}</td>
    <td class="${diffClass}">${r.diff.toFixed(0)}</td>
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


//---------------------------------------------------------
// Main Calculate Function
//---------------------------------------------------------
async function calculateRoutes() {
  const riders = getRiders();
  const ranked = rankRoutes(routes, riders);
  renderAverages(riders);
  renderBeeswarm(clsRiders, opponentRiders);
  renderResults(ranked);
}
