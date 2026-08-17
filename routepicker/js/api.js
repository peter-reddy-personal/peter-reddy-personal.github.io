/**
 * API layer for fetching and processing data
 */

import { API_ENDPOINTS, LOW_SAMPLE_THRESHOLD } from "./config.js";

/**
 * Fetch all teams from teams.json
 */
export async function fetchAllTeams() {
  try {
    const res = await fetch(API_ENDPOINTS.teams);
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
export async function fetchAllRoutes() {
  try {
    const res = await fetch(API_ENDPOINTS.routes);
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
    const rider = data?.props?.pageProps?.rider;

    if (!rider) {
      console.warn(`No rider data found for ${riderId}`);
      return { error: true };
    }

    return rider;
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
