/**
 * Data processing and calculation functions for routes and riders
 */

import { DOM_SELECTORS } from "./config.js";
import { getElement } from "./utils.js";

/**
 * Extract rider data from DOM inputs
 * Reads factor values from the rider table rows
 */
export function getRidersFromDOM() {
  const rows = document.querySelectorAll(".rider-row");
  const riders = [];

  rows.forEach((row) => {
    // Only read FACTOR MODE rows (not power mode)
    if (!row.classList.contains("power-mode")) {
      const parentId = row.parentElement.id;
      const team = parentId === "home-table" ? "home" : "away";

      riders.push({
        team,
        selected: row.querySelector(".rider-select")?.checked ?? false,
        name: row.querySelector(".rider-link")?.textContent.trim() || "",
        sprint: Number(row.querySelector(".rider-sprint")?.textContent) || 0,
        punch: Number(row.querySelector(".rider-punch")?.textContent) || 0,
        climb: Number(row.querySelector(".rider-climb")?.textContent) || 0,
        tt: Number(row.querySelector(".rider-tt")?.textContent) || 0,
        pursuit: Number(row.querySelector(".rider-pursuit")?.textContent) || 0,
        endurance: Number(row.querySelector(".rider-endurance")?.textContent) || 0
      });
    }
  });

  return riders;
}

/**
 * Compute score for a single rider on a specific route
 * Multiplies rider vELO factors by route weightings
 */
export function computeSingleRiderScore(route, rider) {
  return (
    rider.sprint * route.Sprint +
    rider.punch * route.Punch +
    rider.climb * route.Climb +
    rider.tt * route.TT +
    rider.pursuit * route.Pursuit +
    rider.endurance * route.Endurance
  );
}

/**
 * Rank selected riders from both teams for a route.
 */
export function rankRidersForRoute(route, riders) {
  if (!route) return [];

  return riders
    .filter((rider) => rider.selected === true)
    .map((rider) => {
      const factors = rider.zr?.velo?.factors || {};
      const score = computeSingleRiderScore(route, {
        sprint: factors.sprint || 0,
        punch: factors.punch || 0,
        climb: factors.climb || 0,
        tt: factors.timeTrial || 0,
        pursuit: factors.pursuit || 0,
        endurance: factors.endurance || 0
      });

      return { ...rider, routeScore: score };
    })
    .sort((a, b) => b.routeScore - a.routeScore);
}

function buildSubsets(riders, size) {
  if (riders.length <= size) return [riders];

  const subsets = [];
  function collect(start, subset) {
    if (subset.length === size) {
      subsets.push(subset);
      return;
    }

    for (let index = start; index <= riders.length - (size - subset.length); index += 1) {
      collect(index + 1, [...subset, riders[index]]);
    }
  }

  collect(0, []);
  return subsets;
}

/**
 * Calculate the average points for every possible team subset pairing.
 */
export function calculateExpectedPoints(route, homeRiders, awayRiders) {
  if (!route) return { home: 0, away: 0, pairings: 0 };

  const homeSubsets = buildSubsets(homeRiders.filter((rider) => rider.selected === true), 5);
  const awaySubsets = buildSubsets(awayRiders.filter((rider) => rider.selected === true), 5);
  if (!homeSubsets.length || !awaySubsets.length) {
    return { home: 0, away: 0, pairings: 0 };
  }

  let homeTotal = 0;
  let awayTotal = 0;
  let pairings = 0;

  homeSubsets.forEach((homeSubset) => {
    awaySubsets.forEach((awaySubset) => {
      const ranked = rankRidersForRoute(route, [...homeSubset, ...awaySubset]);
      ranked.forEach((rider, index) => {
        const points = 10 - index;
        if (rider.team === "home") homeTotal += points;
        else awayTotal += points;
      });
      pairings += 1;
    });
  });

  return {
    home: homeTotal / pairings,
    away: awayTotal / pairings,
    pairings
  };
}

/**
 * Compute average vELO scores for both teams on a specific route
 */
export function computeRouteScores(route, riders) {
  const homeRiders = riders.filter((r) => r.team === "home" && r.selected === true);
  const awayRiders = riders.filter(
    (r) => r.team === "away" && r.selected === true
  );

  function avgScore(team) {
    if (team.length === 0) return 0;
    const total = team.reduce((sum, rider) => {
      return sum + computeSingleRiderScore(route, rider);
    }, 0);
    return total / team.length;
  }

  const avgHome = avgScore(homeRiders);
  const avgAway = avgScore(awayRiders);

  return {
    avgHome,
    avgAway,
    diff: avgHome - avgAway
  };
}

/**
 * Rank routes with optional randomness for suggestions
 * Randomness allows picking good (but not always best) routes
 */
export function rankRoutes(routes, riders) {
  const ladderToggle = getElement(DOM_SELECTORS.ladderToggle);
  const ladderOnly = ladderToggle?.checked ?? false;

  // Filter to ladder-only routes if toggle is on
  const filtered = ladderOnly ? routes.filter((r) => r.Ladder === true) : routes;

  // Score all routes and apply jitter
  const scored = filtered.map((route) => {
    const scores = computeRouteScores(route, riders);

    // Get randomness slider value (0-100)
    const randomnessSlider = getElement(DOM_SELECTORS.randomnessSlider);
    const randomness = randomnessSlider ? Number(randomnessSlider.value) : 50;

    // Apply quadratic scaling to randomness for smoother curve
    const jitterStrength = Math.pow(randomness / 100, 2) * 100;
    const jitterValue = (Math.random() - 0.5) * jitterStrength;

    return {
      ...route,
      avgHome: scores.avgHome,
      avgAway: scores.avgAway,
      diff: scores.diff,
      jitteredDiff: scores.diff + jitterValue
    };
  });

  // Sort by jittered difference in both directions
  const bestCLS = [...scored].sort((a, b) => b.jitteredDiff - a.jitteredDiff);
  const bestOpp = [...scored].sort((a, b) => a.jitteredDiff - b.jitteredDiff);

  return { bestCLS, bestOpp };
}
