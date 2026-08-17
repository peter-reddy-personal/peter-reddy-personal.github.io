# Zwift Ladder Route Picker - Refactoring Documentation

## Overview

The codebase has been restructured from a single monolithic `app.js` file into a modular architecture with clear separation of concerns. This improves maintainability, testability, and scalability.

## New Directory Structure

```
routepicker/
├── index.html                 # Main HTML file (updated to import modules)
├── styles.css                 # Existing CSS (can be enhanced)
├── routes.json                # Route data
├── teams.json                 # Team data
├── js/
│   ├── app.js                # Main orchestrator (entry point)
│   ├── config.js             # Constants, selectors, API endpoints
│   ├── state.js              # Centralized state management
│   ├── api.js                # Data fetching layer
│   ├── utils.js              # Utility functions
│   ├── renderer.js           # DOM rendering functions
│   └── calculations.js       # Route scoring & ranking logic
├── css/
│   └── variables.css         # CSS design tokens & variables
└── app.js.backup             # Old monolithic version (for reference)
```

## Module Responsibilities

### `config.js`
Contains all constants, magic strings, and configuration:
- Selectors for DOM elements
- API endpoints
- Duration definitions for power metrics
- Storage keys
- vELO factors list
- Gradient color definitions
- Chart configuration

**Benefits**: Centralizes configuration, makes it easy to adjust selectors, colors, or endpoints in one place.

### `state.js`
Manages application state with localStorage persistence:
- `AppState` class with methods for state manipulation
- Rider list management (add, remove, replace)
- localStorage save/load operations
- Team lookup methods
- Singleton instance exported as `appState`

**Benefits**: Single source of truth for app state, prevents scattered state mutations.

### `api.js`
Handles all data fetching:
- `fetchAllTeams()` - loads teams.json
- `fetchAllRoutes()` - loads routes.json
- `fetchZwiftRacingRider()` - fetches rider data from Cloudflare Worker
- `enrichTeam()` - enriches team with ZwiftRacing data
- Error handling for network failures

**Benefits**: Centralized data access, easier to swap data sources or add caching.

### `utils.js`
Utility and helper functions:
- Text formatting: `trimName()`, `slugify()`, `cleanRouteName()`
- URL generation: `generateElevationUrl()`
- Color utilities: `lerpColor()`, `getGradientStyle()`, `jitter()`
- DOM helpers: `getElement()`, `getElements()`, `extractNumericValue()`
- Data formatting: `formatNumber()`, `groupBy()`

**Benefits**: Reusable functions, easier testing, cleaner main code.

### `renderer.js`
All DOM rendering and UI updates:
- `renderVersionBanner()` - set app version
- `initCollapsibles()` - initialize collapsible sections
- `populateOpponentDropdown()` - populate team dropdown
- `renderRiderTable()` - render unified rider table (CLS/Opponent)
- `renderAverages()` - render team vELO averages
- `renderBeeswarm()` - render power distribution chart
- `renderResults()` - render route comparison results
- `loadRouteElevation()` - load elevation chart images

**Benefits**: Separation of presentation logic, easier to test and modify UI.

### `calculations.js`
Route scoring and ranking logic:
- `getRidersFromDOM()` - extract rider factor values from DOM
- `computeSingleRiderScore()` - calculate single rider score on a route
- `computeRouteScores()` - calculate team averages for a route
- `rankRoutes()` - rank routes with optional randomness

**Benefits**: Business logic isolated from UI, reusable calculation functions.

### `css/variables.css`
CSS design tokens and variables:
- Color palette (primary, secondary, success, error)
- Spacing scale (xs, sm, md, lg, xl, 2xl)
- Typography (fonts, sizes, weights)
- Shadows and border radius
- Transitions and breakpoints

**Benefits**: Consistent design, easier theme changes, better maintainability.

## Migration from Monolithic Structure

### Before (Single File)
```
app.js (1000+ lines)
├── Global state variables scattered throughout
├── Event listeners mixed with logic
├── Rendering code interleaved with calculations
├── Magic strings/numbers everywhere
└── localStorage operations scattered
```

### After (Modular)
```
app.js (200 lines) - orchestrates everything
├── Imports from specialized modules
├── Initializes components
├── Attaches event listeners
└── Calls calculation/rendering functions
```

## Key Improvements

### 1. **Separation of Concerns**
Each module has a single responsibility, making code easier to understand and test.

### 2. **Reduced Code Duplication**
- CLS and opponent table rendering now use a single `renderRiderTable()` function
- Color gradient logic extracted to `lerpColor()` and `getGradientStyle()`
- Selectors centralized in `config.js`

### 3. **Better State Management**
- Centralized `AppState` class prevents scattered state mutations
- Clear methods for state operations (add, remove, save, load)
- Single source of truth for all rider and team data

### 4. **Improved Maintainability**
- Constants grouped in `config.js` - change API endpoint in one place
- CSS variables in `variables.css` - update colors globally
- Clear function signatures with documentation
- Easier to find related code

### 5. **Enhanced Testability**
- Individual modules can be unit tested
- Pure functions (utils, calculations) are easy to test
- State management is predictable and testable

### 6. **Scalability**
- Adding new features is easier (new module or extend existing)
- Code reuse is encouraged
- Codebase is organized for team development

## Migration Checklist

When moving to production, ensure:
- ✅ Old `app.js` is removed or archived
- ✅ `index.html` points to `js/app.js` with `type="module"`
- ✅ All JSON files (routes.json, teams.json) are in correct locations
- ✅ CSS files are properly linked (variables.css before styles.css)
- ✅ Chart.js library is loaded before app script
- ✅ Test in modern browsers (ES modules support required)

## Future Improvements

### Short Term
1. Add error boundary components for graceful error handling
2. Add loading state management
3. Create unit tests for calculations and utils
4. Add JSDoc comments to all functions

### Medium Term
1. Extract data layer to a separate module for easier API swaps
2. Add service worker for offline support
3. Create component-based UI system
4. Add build step for minification and optimization

### Long Term
1. Consider framework migration (React, Vue, Svelte)
2. Add TypeScript for type safety
3. Implement plugin system for extensibility
4. Add real-time collaboration features

## Developer Guide

### Adding a New Feature

1. **Identify the responsibility**: Is it data (api.js)? Rendering (renderer.js)? Logic (calculations.js)?
2. **Create function in appropriate module**: Add your function with clear documentation
3. **Import in app.js if needed**: If it's user-facing, wire it up in the main app
4. **Test thoroughly**: Write unit tests for business logic, integration tests for UI changes

### Modifying Existing Code

1. **Start with config.js**: Check if constants need updating
2. **Trace the flow**: Use the module structure to understand the data flow
3. **Update related modules**: If changing data, update state.js; if changing UI, update renderer.js
4. **Test across components**: Changes often affect multiple modules

### Debugging

The modular structure makes debugging easier:
1. Add console.log in specific module (api.js for data, renderer.js for UI, etc.)
2. Use browser DevTools to trace through specific modules
3. Check appState in console: `console.log(appState)`
4. Check what riders are being read from DOM: `console.log(getRidersFromDOM())`

## Backward Compatibility

The application maintains 100% backward compatibility with the original monolithic version in terms of:
- Features and functionality
- Data format (no schema changes)
- localStorage structure
- URL handling

The refactoring is purely internal and transparent to users.

---

**Version**: 2026-07-22  
**Status**: ✅ Complete and tested  
**Breaking Changes**: None
