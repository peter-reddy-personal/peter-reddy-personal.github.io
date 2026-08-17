/**
 * Utility functions for data processing and formatting
 */

import { TRIM_NAME_MAX, GRADIENT_COLORS } from "./config.js";

/**
 * Trim rider name to maximum length
 */
export function trimName(name, max = TRIM_NAME_MAX) {
  return name.length > max ? name.slice(0, max) + "…" : name;
}

/**
 * Convert string to URL-friendly slug
 * Removes quotes, spaces, special characters; converts to lowercase
 */
export function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Clean route name by removing leading multipliers (e.g., "2x ", "3x ")
 */
export function cleanRouteName(name) {
  return String(name).replace(/^\d+x\s+/i, "");
}

/**
 * Generate elevation chart URL for a route
 */
export function generateElevationUrl(worldName, routeName) {
  const world = slugify(worldName);
  const cleanedRoute = cleanRouteName(routeName);
  const route = slugify(cleanedRoute);
  return `https://zwiftinsider.com/wp-content/routes/${world}/${route}.svg`;
}

/**
 * Linear interpolation for color gradient between two RGB colors
 * Used for heatmap display of power values
 */
export function lerpColor(min, max, value) {
  if (
    value === "N/A" ||
    value === undefined ||
    value === null ||
    !isFinite(min) ||
    !isFinite(max) ||
    min === max
  ) {
    return GRADIENT_COLORS.neutral;
  }

  const t = (value - min) / (max - min);

  // Green to red gradient
  const start = { r: 220, g: 250, b: 230 };
  const end = { r: 255, g: 225, b: 225 };

  const r = Math.round(start.r + (end.r - start.r) * t);
  const g = Math.round(start.g + (end.g - start.g) * t);
  const b = Math.round(start.b + (end.b - start.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Generate background color for vELO factor differences
 * Uses gradient stops for readable visualization
 */
export function getGradientStyle(value) {
  if (value === 0) {
    return `background-color: ${GRADIENT_COLORS.neutral};`;
  }

  const abs = Math.abs(value);

  for (const stop of GRADIENT_COLORS.stops) {
    if (abs <= stop.limit) {
      const color = value > 0 ? stop.pos : stop.neg;
      return `background-color: ${color};`;
    }
  }

  // Beyond the highest limit
  const color = value > 0 ? GRADIENT_COLORS.maxPos : GRADIENT_COLORS.maxNeg;
  return `background-color: ${color};`;
}

/**
 * Generate pseudo-random jitter within specified range
 * Used to avoid overlapping points in scatter plots
 */
export function jitter(range = 0.12) {
  return (Math.random() - 0.5) * range;
}

/**
 * Safe DOM element getter with error handling
 */
export function getElement(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    console.warn(`Element not found: ${selector}`);
  }
  return element;
}

/**
 * Safe list of DOM elements getter
 */
export function getElements(selector) {
  return document.querySelectorAll(selector);
}

/**
 * Format number with specified decimal places
 */
export function formatNumber(value, decimals = 1) {
  if (typeof value !== "number" || !isFinite(value)) {
    return "N/A";
  }
  return value.toFixed(decimals);
}

/**
 * Extract numeric value from DOM element, with fallback
 */
export function extractNumericValue(element, defaultValue = 0) {
  if (!element) return defaultValue;
  const value = Number(element.value || element.textContent);
  return isFinite(value) ? value : defaultValue;
}

/**
 * Log with timestamp (useful for debugging)
 */
export function logWithTime(message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  if (data) {
    console.log(`[${timestamp}] ${message}`, data);
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
}

/**
 * Group array items by a key
 */
export function groupBy(array, keyFn) {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}
