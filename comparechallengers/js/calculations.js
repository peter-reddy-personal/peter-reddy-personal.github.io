import { FACTORS } from "./config.js";

const EXPECTED_SCORE_WEIGHTS = {
  sprint: 0.103,
  punch: 0.215,
  climb: 0.131,
  pursuit: 0.2,
  timeTrial: 0,
  endurance: 0.351
};
const MAX_EXPECTED_POINTS_DRAWS = 150;

export function getFactorValue(rider, key) {
  const historyEntry = rider.zr?.history?.find((entry) => {
    const value = entry?.velo?.elo?.factors?.[key]?.after;
    return value !== undefined && value !== null && Number.isFinite(Number(value));
  });
  const value = historyEntry?.velo?.elo?.factors?.[key]?.after;

  return value === undefined || value === null ? 0 : Number(value);
}

function hasUsableFactorScores(rider) {
  return FACTORS.every(({ key }) => {
    const value = getFactorValue(rider, key);
    return Number.isFinite(value) && value !== 0;
  });
}

export function averageFactors(riders) {
  const selected = riders.filter((rider) => rider.selected === true && hasUsableFactorScores(rider));
  return Object.fromEntries(FACTORS.map(({ key }) => [
    key,
    selected.length
      ? selected.reduce((total, rider) => total + getFactorValue(rider, key), 0) / selected.length
      : 0
  ]));
}

export function eligibleOpponents(team, teams) {
  const region = team?.positions?.region;
  if (!region || typeof region.rank !== "number") return [];
  return teams
    .filter((candidate) => candidate.number !== team.number)
    .filter((candidate) => candidate.positions?.region?.name === region.name)
    .filter((candidate) => Math.abs(candidate.positions.region.rank - region.rank) <= 15)
    .sort((a, b) => a.positions.region.rank - b.positions.region.rank);
}

function riderStrength(rider) {
  return Object.entries(EXPECTED_SCORE_WEIGHTS).reduce(
    (total, [key, weight]) => total + getFactorValue(rider, key) * weight,
    0
  );
}

function bestLadderRoute(strengths, routes) {
  const differences = Object.fromEntries(strengths.map(({ key, difference }) => [key, difference]));
  return routes
    .filter((route) => route.Ladder === true)
    .map((route) => ({
      route,
      score: ["sprint", "punch", "climb", "pursuit", "endurance"].reduce(
        (total, key) => total + differences[key] * (route[key.charAt(0).toUpperCase() + key.slice(1)] || 0),
        0
      )
    }))
    .sort((a, b) => b.score - a.score)[0]?.route;
}

export function expectedPoints(homeRiders, awayRiders) {
  const selectedHome = homeRiders.filter((rider) => rider.selected === true && hasUsableFactorScores(rider));
  const usableAway = awayRiders.filter(hasUsableFactorScores);
  const comparisonSize = Math.min(5, selectedHome.length, usableAway.length);
  if (!comparisonSize) return { home: 0, away: 0 };

  const totals = { home: 0, away: 0 };
  for (let draw = 0; draw < MAX_EXPECTED_POINTS_DRAWS; draw += 1) {
    const home = randomRiders(selectedHome, comparisonSize);
    const away = randomRiders(usableAway, comparisonSize);
    const ranked = [...home.map((rider) => ({ rider, team: "home" })), ...away.map((rider) => ({ rider, team: "away" }))]
      .sort((a, b) => riderStrength(b.rider) - riderStrength(a.rider));
    ranked.forEach((entry, index) => {
      totals[entry.team] += Math.max(0, 10 - index);
    });
  }
  return {
    home: totals.home / MAX_EXPECTED_POINTS_DRAWS,
    away: totals.away / MAX_EXPECTED_POINTS_DRAWS
  };
}

function randomRiders(riders, count) {
  return riders
    .map((rider) => ({ rider, sortKey: Math.random() }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(0, count)
    .map(({ rider }) => rider);
}

export function compareTeam(homeRiders, opponent) {
  const home = averageFactors(homeRiders);
  const away = averageFactors(opponent.riders || []);
  const differences = Object.fromEntries(FACTORS.map(({ key }) => [key, home[key] - away[key]]));
  const strengths = FACTORS.filter(({ key }) => differences[key] > 0).map(({ label }) => label);
  const points = expectedPoints(homeRiders, opponent.riders || []);
  return { ...opponent, home, away, differences, strengths, points };
}

export function aggregateComparisons(comparisons, selectedTeam, teams, routes = []) {
  if (!comparisons.length) {
    return {
      wins: 0,
      total: 0,
      averagePoints: 0,
      rankingStatus: "approximately correct position",
      routeConclusion: "",
      strengths: []
    };
  }
  const strengths = FACTORS.map(({ key, label }) => {
    const difference = comparisons.reduce(
      (sum, comparison) => sum + comparison.differences[key],
      0
    ) / comparisons.length;
    return {
      key,
      label,
      teamAverage: comparisons[0].home[key],
      opponentAverage: comparisons.reduce((sum, comparison) => sum + comparison.away[key], 0) / comparisons.length,
      difference
    };
  });
  const rankedKeys = [...strengths].sort((a, b) => b.difference - a.difference);
  const rankByKey = new Map(rankedKeys.map((item, index) => [item.key, index]));
  strengths.forEach((item) => {
    item.rank = rankByKey.get(item.key);
  });
  const averagePoints = comparisons.reduce((sum, comparison) => sum + comparison.points.home, 0) / comparisons.length;
  const regionalTeams = teams?.filter(
    (team) => team.positions?.region?.name === selectedTeam?.positions?.region?.name
  ) || [];
  const regionalRank = selectedTeam?.positions?.region?.rank;
  const maxRegionalRank = Math.max(...regionalTeams.map((team) => team.positions.region.rank), regionalRank || 0);
  const isBoundaryRank = regionalRank <= 15 || regionalRank > maxRegionalRank - 15;
  const rankingStatus = isBoundaryRank
    ? "approximately correct position"
    : averagePoints > 35
      ? "dramatically under ranked"
      : averagePoints > 29
        ? "slightly under ranked"
        : averagePoints > 24
          ? "approximately correct position"
          : averagePoints > 19
            ? "slightly over ranked"
            : "dramatically over ranked";
  const sprintProfile = strengths
    .filter((item) => ["sprint", "punch", "climb"].includes(item.key))
    .sort((a, b) => b.difference - a.difference)[0];
  const lengthDifference = strengths.find((item) => item.key === "pursuit").difference -
    strengths.find((item) => item.key === "endurance").difference;
  const routeLength = Math.abs(lengthDifference) < 10
    ? "medium-length"
    : lengthDifference > 0 ? "short" : "long";
  const routeProfileLabels = {
    climb: "climbing-focused",
    sprint: "sprint-focused",
    punch: "punchy"
  };
  const bestRoute = bestLadderRoute(strengths, routes);
  return {
    wins: comparisons.filter((comparison) => comparison.points.home > comparison.points.away).length,
    total: comparisons.length,
    averagePoints,
    rankingStatus,
    routeConclusion: `This team performs relatively best on ${routeLength}, ${routeProfileLabels[sprintProfile.key]} routes${bestRoute ? `, such as ${bestRoute.Route}` : ""}.`,
    strengths
  };
}
