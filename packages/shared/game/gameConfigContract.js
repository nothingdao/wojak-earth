import { DEFAULT_SIMULATION_CONFIG, } from "./simulation.js";
import { DEFAULT_PROGRESSION_BANDS, } from "./progression.js";
export { DEFAULT_PROGRESSION_BANDS };
export const DEFAULT_TIER_BREAKPOINTS_USD = [0.0024, 0.01, 0.05, 0.1];
export const DEFAULT_PILLS_PER_TIER = [5, 10, 25, 50, 100];
export const DEFAULT_ASTRDS_PER_PILL = [10, 5, 2, 1, 0.5];
export const GAME_CONFIG_VERSION = 1;
const SIMULATION_NUMBER_KEYS = Object.keys(DEFAULT_SIMULATION_CONFIG).filter((key) => typeof DEFAULT_SIMULATION_CONFIG[key] === "number");
function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}
function readNumber(input, key, fallback, errors) {
    const value = input[key];
    if (value === undefined)
        return fallback;
    if (isFiniteNumber(value))
        return value;
    errors?.push(`Missing or invalid field: ${key}`);
    return fallback;
}
function readNumberArray(input, key, fallback, length, errors) {
    const value = input[key];
    if (value === undefined)
        return [...fallback];
    if (Array.isArray(value) &&
        value.length === length &&
        value.every(isFiniteNumber)) {
        return [...value];
    }
    errors?.push(`Missing or invalid field: ${key}`);
    return [...fallback];
}
function isRecord(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function isCurvePolicy(value) {
    if (!isRecord(value) || typeof value.mode !== "string")
        return false;
    switch (value.mode) {
        case "fixed":
            return isFiniteNumber(value.value);
        case "linear":
            return isFiniteNumber(value.from) && isFiniteNumber(value.to);
        case "step":
            return (isFiniteNumber(value.start) &&
                isFiniteNumber(value.increment) &&
                (value.cap === undefined || isFiniteNumber(value.cap)));
        case "randomRange":
            return (isFiniteNumber(value.min) &&
                isFiniteNumber(value.max) &&
                (value.seedMode === undefined ||
                    value.seedMode === "session" ||
                    value.seedMode === "level"));
        default:
            return false;
    }
}
function isBudgetPolicy(value) {
    if (!isRecord(value))
        return false;
    if (value.mode !== "budget" || !isFiniteNumber(value.count))
        return false;
    if (!["even", "random", "early", "late", "manual"].includes(String(value.distribution)))
        return false;
    return (value.levels === undefined ||
        (Array.isArray(value.levels) && value.levels.every(isFiniteNumber)));
}
export function isLevelBandPolicy(value) {
    if (!isRecord(value))
        return false;
    return (typeof value.id === "string" &&
        isFiniteNumber(value.fromLevel) &&
        isFiniteNumber(value.toLevel) &&
        isCurvePolicy(value.asteroidCount) &&
        isCurvePolicy(value.asteroidSpeed) &&
        isBudgetPolicy(value.shipPickups) &&
        isBudgetPolicy(value.powerups) &&
        isCurvePolicy(value.maxLives) &&
        (value.chaos === undefined ||
            (isRecord(value.chaos) && typeof value.chaos.enabled === "boolean")));
}
function readProgressionBands(input, errors) {
    const value = input.progressionBands;
    if (value === undefined)
        return DEFAULT_PROGRESSION_BANDS;
    if (Array.isArray(value) &&
        value.length > 0 &&
        value.every(isLevelBandPolicy)) {
        return value;
    }
    errors?.push("Missing or invalid field: progressionBands");
    return DEFAULT_PROGRESSION_BANDS;
}
export const DEFAULT_GAME_CONFIG = {
    version: GAME_CONFIG_VERSION,
    applyToRunning: false,
    ...DEFAULT_SIMULATION_CONFIG,
    quarterUsd: 0.25,
    tierBreakpointsUsd: [...DEFAULT_TIER_BREAKPOINTS_USD],
    pillsPerTier: [...DEFAULT_PILLS_PER_TIER],
    astrdsPerPill: [...DEFAULT_ASTRDS_PER_PILL],
};
export function normalizeGameConfig(input) {
    return parseGameConfig(input).config;
}
export function parseGameConfig(input, options = {}) {
    const source = isRecord(input) ? input : {};
    const errors = [];
    const requireAll = options.requireAll === true;
    const read = (key, fallback) => {
        if (requireAll && source[key] === undefined)
            errors.push(`Missing or invalid field: ${key}`);
        return readNumber(source, key, fallback, errors);
    };
    const readArray = (key, fallback, length) => {
        if (requireAll && source[key] === undefined)
            errors.push(`Missing or invalid field: ${key}`);
        return readNumberArray(source, key, fallback, length, errors);
    };
    const config = {
        ...DEFAULT_GAME_CONFIG,
        version: readNumber(source, "version", DEFAULT_GAME_CONFIG.version),
        applyToRunning: Boolean(source.applyToRunning ?? DEFAULT_GAME_CONFIG.applyToRunning),
        quarterUsd: read("quarterUsd", DEFAULT_GAME_CONFIG.quarterUsd),
        tierBreakpointsUsd: readArray("tierBreakpointsUsd", DEFAULT_TIER_BREAKPOINTS_USD, 4),
        pillsPerTier: readArray("pillsPerTier", DEFAULT_PILLS_PER_TIER, 5),
        astrdsPerPill: readArray("astrdsPerPill", DEFAULT_ASTRDS_PER_PILL, 5),
        progressionBands: readProgressionBands(source, errors),
    };
    for (const key of SIMULATION_NUMBER_KEYS) {
        config[key] = read(key, DEFAULT_SIMULATION_CONFIG[key]);
    }
    return {
        ok: errors.length === 0,
        config,
        errors: [...new Set(errors)],
    };
}
export function parseGameConfigPayload(input) {
    return parseGameConfig(input, { requireAll: true });
}
