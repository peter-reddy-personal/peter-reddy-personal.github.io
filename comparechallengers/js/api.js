import { enrichTeam as enrichTeamFromApi } from "../../routepicker/js/api.js?v=20261009";

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
const CACHE_KEY_PREFIX = "compareChallengersZwiftRacing:";

function readCachedBody(key) {
  let cachedValue;
  try {
    cachedValue = localStorage.getItem(key);
  } catch (error) {
    console.error("Unable to read Compare Challengers API cache:", error);
    return null;
  }
  if (!cachedValue) return null;

  try {
    const cached = JSON.parse(cachedValue);
    if (
      typeof cached.body === "string" &&
      typeof cached.expiresAt === "number" &&
      cached.expiresAt > Date.now()
    ) {
      return cached.body;
    }
  } catch (error) {
    console.warn("Ignoring invalid Compare Challengers API cache entry:", error);
  }

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Unable to remove invalid Compare Challengers API cache entry:", error);
  }
  return null;
}

async function cachedFetch(url) {
  const cacheKey = `${CACHE_KEY_PREFIX}${url}`;
  const cachedBody = readCachedBody(cacheKey);
  if (cachedBody !== null) return new Response(cachedBody);

  const response = await fetch(url);
  const body = await response.text();

  if (response.ok) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        body,
        expiresAt: Date.now() + CACHE_DURATION_MS
      }));
    } catch (error) {
      console.error("Unable to save Compare Challengers API cache:", error);
    }
  }

  return new Response(body, {
    status: response.status,
    statusText: response.statusText
  });
}

export function enrichTeam(team) {
  return enrichTeamFromApi(team, cachedFetch);
}
