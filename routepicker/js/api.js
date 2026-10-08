/**
 * API layer for fetching and processing data
 */

import { API_ENDPOINTS, LOW_SAMPLE_THRESHOLD } from "./config.js";

const PHENOTYPE_LABELS = {
  sprinter: "Sprinter",
  puncher: "Puncher",
  allRounder: "All rounder",
  climber: "Climber",
  tt: "Time trialist"
};

/**
 * Fetch all teams from teams.json
 */
export async function fetchAllTeams(endpoint = API_ENDPOINTS.teams) {
  try {
    const res = await fetch(endpoint);
    if (!res.ok) {
      throw new Error(`Failed to fetch teams: ${res.status}`);
    }
    const teams = await res.json();
    console.log(`Teams loaded: ${teams.length}`);
    return teams;
  } catch (error) {
    console.error("Error loading teams:", error);
    throw error;
  }
}

/**
 * Fetch all routes from routes.json
 */
export async function fetchAllRoutes(endpoint = API_ENDPOINTS.routes) {
  try {
    const res = await fetch(endpoint);
    if (!res.ok) {
      throw new Error(`Failed to fetch routes: ${res.status}`);
    }
    const routes = await res.json();
    console.log(`Routes loaded: ${routes.length}`);
    return routes;
  } catch (error) {
    console.error("Error loading routes:", error);
    throw error;
  }
}

/**
 * Fetch ZwiftRacing data for a single rider via Cloudflare Worker
 */
export async function fetchZwiftRacingRider(riderId) {
  try {
    console.log(`Fetching ZwiftRacing data for rider: ${riderId}`);
    const url = API_ENDPOINTS.zwiftRacing(riderId);
    const res = await fetch(url);

    if (!res.ok) {
      console.warn(`ZwiftRacing fetch failed for rider ${riderId}: ${res.status}`);
      return { error: true };
    }

    const data = await res.json();
    const rider = data?.props?.pageProps?.rider ?? data?.rider ?? data;

    if (
      !rider ||
      typeof rider !== "object" ||
      Array.isArray(rider) ||
      !("riderId" in rider || "velo" in rider || "history" in rider || "power" in rider)
    ) {
      console.warn(`No rider data found for ${riderId}`);
      return { error: true };
    }

    const normalized = { ...rider };
    const factors = rider.velo?.factors;
    if (
      (!Array.isArray(normalized.history) || normalized.history.length === 0) &&
      factors &&
      typeof factors === "object" &&
      !Array.isArray(factors)
    ) {
      normalized.history = [{
        velo: {
          elo: {
            factors: Object.fromEntries(
              Object.entries(factors).map(([key, value]) => [key, { after: value }])
            )
          }
        }
      }];
    }

    if (rider.power && typeof rider.power === "object") {
      normalized.power = Object.fromEntries(
        Object.entries(rider.power).map(([key, value]) => [
          key,
          Array.isArray(value) || typeof value !== "number" ? value : [value]
        ])
      );
    }

    if (typeof rider.phenotype === "string") {
      normalized.phenotype = { value: PHENOTYPE_LABELS[rider.phenotype] ?? rider.phenotype };
    } else if (typeof rider.phenotype?.value === "string") {
      normalized.phenotype = {
        ...rider.phenotype,
        value: PHENOTYPE_LABELS[rider.phenotype.value] ?? rider.phenotype.value
      };
    }

    return normalized;
  } catch (error) {
    console.error(`Error fetching ZwiftRacing data for rider ${riderId}:`, error);
    return { error: true };
  }
}

/**
 * Enrich a team's riders with ZwiftRacing data
 * Fetches vELO2 scores, power metrics, and other rider statistics
 */
export async function enrichTeam(team) {
  if (!team || !team.riders) {
    throw new Error("Invalid team object");
  }

  const enriched = [];

  for (const rider of team.riders) {
    const zrData = await fetchZwiftRacingRider(rider.id);

    // Check if rider has low sample size for data reliability warning
    const lowSampleWarning =
      zrData &&
      zrData.race &&
      typeof zrData.race.finishes === "number"
        ? zrData.race.finishes < LOW_SAMPLE_THRESHOLD
        : false;

    enriched.push({
      ...rider,
      zr: zrData,
      lowSampleWarning
    });
  }

  return enriched;
}

/**
 * Fetch and enrich a specific team by team number
 */
export async function fetchAndEnrichTeam(teams, teamNumber) {
  const team = teams.find((t) => t.number === teamNumber);
  if (!team) {
    throw new Error(`Team ${teamNumber} not found`);
  }
  return enrichTeam(team);
}
