import { FACTORS } from "./config.js";

const EXPECTED_SCORE_WEIGHTS = {
  sprint: 0.103,
  punch: 0.215,
  climb: 0.131,
  pursuit: 0.2,
  timeTrial: 0,
  endurance: 0.351
};

export function getFactorValue(rider, key) {
  return Number(rider.zr?.velo?.factors?.[key]) || 0;
}

export function averageFactors(riders) {
  const selected = riders.filter((rider) => rider.selected === true);
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

export function expectedPoints(homeRiders, awayRiders) {
  const home = homeRiders.filter((rider) => rider.selected === true).sort((a, b) => riderStrength(b) - riderStrength(a)).slice(0, 5);
  const away = awayRiders.slice().sort((a, b) => riderStrength(b) - riderStrength(a)).slice(0, 5);
  const ranked = [...home.map((rider) => ({ rider, team: "home" })), ...away.map((rider) => ({ rider, team: "away" }))]
    .sort((a, b) => riderStrength(b.rider) - riderStrength(a.rider));
  return ranked.reduce((result, entry, index) => {
    result[entry.team] += Math.max(0, 10 - index);
    return result;
  }, { home: 0, away: 0 });
}

export function compareTeam(homeRiders, opponent) {
  const home = averageFactors(homeRiders);
  const away = averageFactors(opponent.riders || []);
  const differences = Object.fromEntries(FACTORS.map(({ key }) => [key, home[key] - away[key]]));
  const strengths = FACTORS.filter(({ key }) => differences[key] > 0).map(({ label }) => label);
  const points = expectedPoints(homeRiders, opponent.riders || []);
  return { ...opponent, home, away, differences, strengths, points };
}

export function aggregateComparisons(comparisons, selectedTeam, teams) {
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
    : averagePoints > 33
      ? "dramatically under ranked"
      : averagePoints > 28
        ? "slightly under ranked"
        : averagePoints > 21
          ? "approximately correct position"
          : averagePoints > 16
            ? "slightly over ranked"
            : "dramatically over ranked";
  const sprintProfile = strengths
    .filter((item) => ["sprint", "punch", "climb"].includes(item.key))
    .sort((a, b) => b.difference - a.difference)[0];
  const lengthDifference = strengths.find((item) => item.key === "pursuit").difference -
    strengths.find((item) => item.key === "endurance").difference;
  const routeLength = Math.abs(lengthDifference) < 10
    ? "medium"
    : lengthDifference > 0 ? "short" : "long";
  return {
    wins: comparisons.filter((comparison) => comparison.points.home > comparison.points.away).length,
    total: comparisons.length,
    averagePoints,
    rankingStatus,
    routeConclusion: `This team performs relatively best on ${routeLength}, ${sprintProfile.label.toLowerCase()} routes.`,
    strengths
  };
}
