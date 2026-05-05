import { DEFAULT_PROGRESSION_BANDS, resolveLevelConfig, } from "./progression.js";
import { bulletHitsAsteroid as bulletHitsAsteroidCollision, checkCollision, } from "./simulationCollision.js";
export { checkCollision } from "./simulationCollision.js";
const SHIP_RADIUS = 20;
const SHIP_ROTATION_SPEED = 6;
const SHIP_ACCELERATION = 0.25;
const SHIP_INERTIA = 0.99;
const SHIP_INVULNERABILITY_MS = 3000;
const PILL_SPAWN_DELAY_MS = 3000;
const TOKEN_SPAWN_DELAY_MS = 5000;
const SPACE_TOKEN_SPAWN_CHANCE = 0.25;
export const ASTRDS_PILL_COLOR = "#FF642D";
export const COMBO_POWERUP_COLOR = "#4dc1f9";
export const SHIELD_PICKUP_COLOR = "#c084fc";
export const RAPID_FIRE_PICKUP_COLOR = "#fbbf24";
export const DEFAULT_SIMULATION_CONFIG = {
    powerupSpawnDelayMs: 15_000,
    shipPickupSpawnDelayMs: 20_000,
    maxPowerupsOnScreen: 2,
    powerupDurationMs: 10_000,
    maxLives: 5,
    startingLives: 3,
    shipRadius: SHIP_RADIUS,
    shipRotationSpeed: SHIP_ROTATION_SPEED,
    shipAcceleration: SHIP_ACCELERATION,
    shipInertia: SHIP_INERTIA,
    shipInvulnerabilityMs: SHIP_INVULNERABILITY_MS,
    normalBulletSpeed: 15,
    rapidBulletSpeed: 20,
    normalFireDelayMs: 250,
    rapidFireDelayMs: 50,
    bulletRadius: 2,
    rapidBulletRadius: 1.5,
    rapidBulletPower: 2,
    bulletCollisionPadding: 3,
    largeAsteroidRadius: 40,
    mediumAsteroidRadius: 20,
    smallAsteroidRadius: 10,
    asteroidVelocityMin: -1.5,
    asteroidVelocityMax: 1.5,
    asteroidScoreLarge: 10,
    asteroidScoreMedium: 20,
    asteroidScoreSmall: 40,
    pillSpawnDelayMs: PILL_SPAWN_DELAY_MS,
    tokenSpawnDelayMs: TOKEN_SPAWN_DELAY_MS,
    spaceTokenSpawnChance: SPACE_TOKEN_SPAWN_CHANCE,
    pickupTtlMs: 15_000,
    pickupRadius: 8,
    shipPickupRadius: 20,
    maxShipPickupsOnScreen: 1,
    progressionBands: DEFAULT_PROGRESSION_BANDS,
    mineSpawnDelayMs: 20_000,
    mineArmDelayMs: 1_500,
    mineFuseMs: 6_000,
    mineRadius: 13,
    mineBlastRadius: 120,
    mineScore: 75,
    maxMinesOnScreen: 3,
    mineStartLevel: 3,
};
const DEFAULT_EMISSION_TIER = {
    tier: 2,
    pillsPerGame: 10,
    astrdsPerPill: 5,
};
function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function randomNumBetween(min, max) {
    return Math.random() * (max - min + 1) + min;
}
function asteroidVertices(count, radius) {
    const vertices = [];
    for (let i = 0; i < count; i += 1) {
        vertices.push({
            x: (-Math.sin(((360 / count) * i * Math.PI) / 180) +
                (Math.round(Math.random() * 2 - 1) * Math.random()) / 3) *
                radius,
            y: (-Math.cos(((360 / count) * i * Math.PI) / 180) +
                (Math.round(Math.random() * 2 - 1) * Math.random()) / 3) *
                radius,
        });
    }
    return vertices;
}
function rotatePoint(point, center, angle) {
    return {
        x: (point.x - center.x) * Math.cos(angle) -
            (point.y - center.y) * Math.sin(angle) +
            center.x,
        y: (point.x - center.x) * Math.sin(angle) +
            (point.y - center.y) * Math.cos(angle) +
            center.y,
    };
}
function wrapPosition(position, screen, radius = 0) {
    if (position.x > screen.width + radius)
        position.x = -radius;
    else if (position.x < -radius)
        position.x = screen.width + radius;
    if (position.y > screen.height + radius)
        position.y = -radius;
    else if (position.y < -radius)
        position.y = screen.height + radius;
}
function bulletHitsAsteroid(state, bullet, asteroid) {
    return bulletHitsAsteroidCollision(bullet, asteroid, state.config.bulletCollisionPadding);
}
function createShip(screen, now, config = DEFAULT_SIMULATION_CONFIG) {
    return {
        id: createId("ship"),
        position: { x: screen.width / 2, y: screen.height / 2 },
        velocity: { x: 0, y: 0 },
        rotation: 0,
        radius: config.shipRadius,
        isInvulnerable: true,
        isThrusting: false,
        invulnerableUntil: now + config.shipInvulnerabilityMs,
        lastShotAt: 0,
    };
}
function createAsteroid(position, size, config = DEFAULT_SIMULATION_CONFIG) {
    const score = size >= config.largeAsteroidRadius
        ? config.asteroidScoreLarge
        : size > config.smallAsteroidRadius
            ? config.asteroidScoreMedium
            : config.asteroidScoreSmall;
    return {
        id: createId("asteroid"),
        position: { ...position },
        velocity: {
            x: randomNumBetween(config.asteroidVelocityMin, config.asteroidVelocityMax),
            y: randomNumBetween(config.asteroidVelocityMin, config.asteroidVelocityMax),
        },
        rotation: 0,
        radius: size,
        score,
        vertices: asteroidVertices(8, size),
    };
}
function createBullet(ship, rapidFire, now, config) {
    const speed = rapidFire ? config.rapidBulletSpeed : config.normalBulletSpeed;
    const power = rapidFire ? config.rapidBulletPower : 1;
    const radius = rapidFire ? config.rapidBulletRadius : config.bulletRadius;
    const color = "#fff";
    const posDelta = rotatePoint({ x: 0, y: -20 }, { x: 0, y: 0 }, (ship.rotation * Math.PI) / 180);
    const position = {
        x: ship.position.x + posDelta.x,
        y: ship.position.y + posDelta.y,
    };
    return {
        id: createId("bullet"),
        position,
        previousPosition: { ...position },
        velocity: {
            x: ((posDelta.x / 2) * speed) / 10,
            y: ((posDelta.y / 2) * speed) / 10,
        },
        rotation: ship.rotation,
        radius,
        power,
        color,
        createdAt: now,
    };
}
function createMine(position, now, config) {
    return {
        id: createId("mine"),
        position: { ...position },
        radius: config.mineRadius,
        blastRadius: config.mineBlastRadius,
        armAt: now + config.mineArmDelayMs,
        explodeAt: now + config.mineArmDelayMs + config.mineFuseMs,
        armed: false,
        armProgress: 0,
    };
}
function respawnShip(state, now) {
    if (!state.ship)
        return;
    state.lives -= 1;
    if (state.lives <= 0) {
        state.lives = 0;
        state.ship = null;
        state.status = "gameOver";
        return;
    }
    const prevId = state.ship.id;
    const prevLastShotAt = state.ship.lastShotAt;
    state.ship = {
        ...createShip(state.screen, now, state.config),
        id: prevId,
        isInvulnerable: true,
        invulnerableUntil: now + state.config.shipInvulnerabilityMs,
        lastShotAt: prevLastShotAt,
    };
}
function createEdgePickup(kind, screen, color, now, config = DEFAULT_SIMULATION_CONFIG) {
    const radius = kind === "shipPickup" ? config.shipPickupRadius : config.pickupRadius;
    const edge = Math.floor(Math.random() * 4);
    let position = { x: 0, y: 0 };
    switch (edge) {
        case 0:
            position = { x: Math.random() * screen.width, y: -radius };
            break;
        case 1:
            position = { x: screen.width + radius, y: Math.random() * screen.height };
            break;
        case 2:
            position = { x: Math.random() * screen.width, y: screen.height + radius };
            break;
        default:
            position = { x: -radius, y: Math.random() * screen.height };
            break;
    }
    return {
        id: createId(kind),
        kind,
        position,
        velocity: kind === "shipPickup"
            ? { x: 0, y: 0 }
            : { x: randomNumBetween(-1.5, 1.5), y: randomNumBetween(-1.5, 1.5) },
        rotation: 0,
        radius,
        color,
        expiresAt: now + config.pickupTtlMs,
    };
}
function createTokenPickup(screen, now, color, metadata) {
    return {
        ...createEdgePickup("token", screen, color, now),
        source: "space",
        ...metadata,
    };
}
function chooseWeightedPool(pools) {
    const totalWeight = pools.reduce((sum, pool) => sum + Math.max(0, pool.remainingAmount), 0);
    if (totalWeight <= 0)
        return null;
    let roll = Math.random() * totalWeight;
    for (const pool of pools) {
        roll -= Math.max(0, pool.remainingAmount);
        if (roll <= 0)
            return pool;
    }
    return pools[pools.length - 1] ?? null;
}
function spawnAsteroids(screen, count, ship, config = DEFAULT_SIMULATION_CONFIG, level = 1, sessionId = "preview") {
    const levelConfig = resolveLevelConfig(config.progressionBands, level, sessionId);
    const asteroids = [];
    while (asteroids.length < count) {
        const x = randomNumBetween(0, screen.width);
        const y = randomNumBetween(0, screen.height);
        if (Math.abs(x - ship.position.x) < 100 &&
            Math.abs(y - ship.position.y) < 100) {
            continue;
        }
        const asteroid = createAsteroid({ x, y }, config.largeAsteroidRadius, config);
        asteroid.velocity.x *= levelConfig.asteroidSpeedMultiplier;
        asteroid.velocity.y *= levelConfig.asteroidSpeedMultiplier;
        asteroids.push(asteroid);
    }
    return asteroids;
}
export function createInitialSimulationState(sessionId, screen, now = Date.now()) {
    const ship = createShip(screen, now);
    const levelConfig = resolveLevelConfig(DEFAULT_SIMULATION_CONFIG.progressionBands, 1, sessionId);
    const asteroidCount = levelConfig.asteroidCount;
    return {
        sessionId,
        tick: 0,
        status: "playing",
        screen: { ...screen },
        input: { left: false, right: false, up: false, space: false },
        config: { ...DEFAULT_SIMULATION_CONFIG },
        score: 0,
        level: 1,
        lives: Math.min(DEFAULT_SIMULATION_CONFIG.startingLives, levelConfig.maxLives),
        pillsCollected: 0,
        tokensCollected: 0,
        asteroidCount,
        ship,
        asteroids: spawnAsteroids(screen, asteroidCount, ship, DEFAULT_SIMULATION_CONFIG, 1, sessionId),
        bullets: [],
        pills: [],
        tokens: [],
        shipPickups: [],
        spaceTokenPools: [],
        emissionTier: { ...DEFAULT_EMISSION_TIER },
        pillsPerGameCap: DEFAULT_EMISSION_TIER.pillsPerGame,
        pillsSpawned: 0,
        events: [],
        powerups: {
            invincible: false,
            rapidFire: false,
            expiresAt: null,
        },
        powerupPickups: [],
        lastPillSpawnAt: now,
        lastTokenSpawnAt: now,
        lastShipPickupSpawnAt: now,
        lastPowerupSpawnAt: now,
        shipPickupSpawnedLevels: [],
        powerupsSpawnedByLevel: {},
        mines: [],
        lastMineSpawnAt: now,
    };
}
function updatePowerups(state, now) {
    if (state.powerups.expiresAt && now >= state.powerups.expiresAt) {
        state.powerups = { invincible: false, rapidFire: false, expiresAt: null };
    }
}
function updateShip(state, dt, now) {
    const ship = state.ship;
    if (!ship)
        return;
    if (ship.invulnerableUntil > now) {
        ship.isInvulnerable = true;
    }
    else {
        ship.isInvulnerable = false;
    }
    if (state.input.left)
        ship.rotation -= state.config.shipRotationSpeed * dt;
    if (state.input.right)
        ship.rotation += state.config.shipRotationSpeed * dt;
    ship.isThrusting = state.input.up;
    if (state.input.up) {
        ship.velocity.x -=
            Math.sin((-ship.rotation * Math.PI) / 180) *
                state.config.shipAcceleration *
                dt;
        ship.velocity.y -=
            Math.cos((-ship.rotation * Math.PI) / 180) *
                state.config.shipAcceleration *
                dt;
    }
    ship.position.x += ship.velocity.x * dt;
    ship.position.y += ship.velocity.y * dt;
    ship.velocity.x *= state.config.shipInertia;
    ship.velocity.y *= state.config.shipInertia;
    if (ship.rotation >= 360)
        ship.rotation -= 360;
    if (ship.rotation < 0)
        ship.rotation += 360;
    if (ship.position.x > state.screen.width)
        ship.position.x = 0;
    else if (ship.position.x < 0)
        ship.position.x = state.screen.width;
    if (ship.position.y > state.screen.height)
        ship.position.y = 0;
    else if (ship.position.y < 0)
        ship.position.y = state.screen.height;
}
function maybeShootBullet(state, now) {
    const ship = state.ship;
    if (!ship || !state.input.space)
        return;
    const shootDelay = state.powerups.rapidFire
        ? state.config.rapidFireDelayMs
        : state.config.normalFireDelayMs;
    if (now - ship.lastShotAt < shootDelay)
        return;
    ship.lastShotAt = now;
    state.bullets.push(createBullet(ship, state.powerups.rapidFire, now, state.config));
}
function updateAsteroids(state, dt) {
    state.asteroids.forEach((asteroid) => {
        asteroid.position.x += asteroid.velocity.x * dt;
        asteroid.position.y += asteroid.velocity.y * dt;
        asteroid.rotation += randomNumBetween(-1, 1) * dt;
        if (asteroid.rotation >= 360)
            asteroid.rotation -= 360;
        if (asteroid.rotation < 0)
            asteroid.rotation += 360;
        wrapPosition(asteroid.position, state.screen, asteroid.radius);
    });
}
function updateBullets(state, dt, _now) {
    state.bullets = state.bullets.filter((bullet) => {
        bullet.previousPosition = { ...bullet.position };
        bullet.position.x += bullet.velocity.x * dt;
        bullet.position.y += bullet.velocity.y * dt;
        if (bullet.position.x < 0 ||
            bullet.position.y < 0 ||
            bullet.position.x > state.screen.width ||
            bullet.position.y > state.screen.height) {
            return false;
        }
        return true;
    });
}
function updatePickups(pickups, screen, dt, now) {
    return pickups.filter((pickup) => {
        pickup.position.x += pickup.velocity.x * dt;
        pickup.position.y += pickup.velocity.y * dt;
        wrapPosition(pickup.position, screen, pickup.radius);
        return pickup.expiresAt > now;
    });
}
function updateTokenPickups(pickups, screen, dt, now) {
    return updatePickups(pickups, screen, dt, now);
}
function resolveBulletAsteroidCollisions(state) {
    const nextBullets = [];
    const destroyedAsteroids = new Set();
    state.bullets.forEach((bullet) => {
        let hit = false;
        state.asteroids.forEach((asteroid) => {
            if (hit || destroyedAsteroids.has(asteroid.id))
                return;
            if (!bulletHitsAsteroid(state, bullet, asteroid))
                return;
            hit = true;
            destroyedAsteroids.add(asteroid.id);
            state.score += Math.max(0, Math.floor(asteroid.score));
            if (asteroid.radius > state.config.smallAsteroidRadius) {
                const nextSize = asteroid.radius >= state.config.largeAsteroidRadius
                    ? state.config.mediumAsteroidRadius
                    : state.config.smallAsteroidRadius;
                state.asteroids.push(createAsteroid({
                    x: asteroid.position.x + randomNumBetween(-10, 20),
                    y: asteroid.position.y + randomNumBetween(-10, 20),
                }, nextSize, state.config), createAsteroid({
                    x: asteroid.position.x + randomNumBetween(-10, 20),
                    y: asteroid.position.y + randomNumBetween(-10, 20),
                }, nextSize, state.config));
            }
        });
        if (!hit)
            nextBullets.push(bullet);
    });
    state.bullets = nextBullets;
    state.asteroids = state.asteroids.filter((asteroid) => !destroyedAsteroids.has(asteroid.id));
}
function resolveShipPickupCollision(state, pickups, onCollect) {
    if (!state.ship)
        return pickups;
    return pickups.filter((pickup) => {
        if (checkCollision(state.ship, pickup)) {
            onCollect();
            return false;
        }
        return true;
    });
}
function resolveShipTokenCollision(state) {
    if (!state.ship)
        return state.tokens;
    return state.tokens.filter((pickup) => {
        if (!checkCollision(state.ship, pickup)) {
            return true;
        }
        state.tokensCollected += 1;
        state.events.push({
            type: "tokenCollected",
            source: pickup.source,
            spawnId: pickup.spawnId,
            depositId: pickup.depositId,
            mintAddress: pickup.mintAddress,
        });
        return false;
    });
}
function handleShipAsteroidCollisions(state, now) {
    if (!state.ship)
        return;
    const remainingAsteroids = [];
    let collided = false;
    state.asteroids.forEach((asteroid) => {
        if (checkCollision(state.ship, asteroid)) {
            collided = true;
            return;
        }
        remainingAsteroids.push(asteroid);
    });
    if (!collided)
        return;
    state.asteroids = remainingAsteroids;
    if (state.ship.isInvulnerable || state.powerups.invincible) {
        return;
    }
    respawnShip(state, now);
}
function updateMines(state, now) {
    const detonating = [];
    state.mines = state.mines.filter((mine) => {
        mine.armed = now >= mine.armAt;
        mine.armProgress = mine.armed
            ? Math.min(1, (now - mine.armAt) / (mine.explodeAt - mine.armAt))
            : 0;
        if (now >= mine.explodeAt) {
            detonating.push(mine);
            return false;
        }
        return true;
    });
    for (const mine of detonating) {
        // Destroy asteroids caught in the blast
        state.asteroids = state.asteroids.filter((asteroid) => {
            const dx = asteroid.position.x - mine.position.x;
            const dy = asteroid.position.y - mine.position.y;
            if (Math.sqrt(dx * dx + dy * dy) < mine.blastRadius + asteroid.radius) {
                state.score += Math.max(0, Math.floor(asteroid.score));
                return false;
            }
            return true;
        });
        if (!state.ship || state.ship.isInvulnerable || state.powerups.invincible)
            continue;
        const dx = state.ship.position.x - mine.position.x;
        const dy = state.ship.position.y - mine.position.y;
        if (Math.sqrt(dx * dx + dy * dy) <
            mine.blastRadius + state.config.shipRadius) {
            respawnShip(state, now);
        }
    }
}
function resolveBulletMineCollisions(state) {
    const nextBullets = [];
    const destroyedMines = new Set();
    state.bullets.forEach((bullet) => {
        let hit = false;
        state.mines.forEach((mine) => {
            if (hit || destroyedMines.has(mine.id))
                return;
            if (!checkCollision(bullet, mine))
                return;
            hit = true;
            destroyedMines.add(mine.id);
            state.score += state.config.mineScore;
        });
        if (!hit)
            nextBullets.push(bullet);
    });
    state.bullets = nextBullets;
    state.mines = state.mines.filter((mine) => !destroyedMines.has(mine.id));
}
function maybeSpawnMines(state, now) {
    const cfg = state.config;
    if (state.level < cfg.mineStartLevel ||
        state.mines.length >= cfg.maxMinesOnScreen ||
        now - state.lastMineSpawnAt < cfg.mineSpawnDelayMs)
        return;
    const ship = state.ship;
    const safeZone = 160;
    for (let attempt = 0; attempt < 10; attempt++) {
        const x = randomNumBetween(cfg.mineRadius, state.screen.width - cfg.mineRadius);
        const y = randomNumBetween(cfg.mineRadius, state.screen.height - cfg.mineRadius);
        if (ship) {
            const dx = x - ship.position.x;
            const dy = y - ship.position.y;
            if (Math.sqrt(dx * dx + dy * dy) < safeZone)
                continue;
        }
        state.mines.push(createMine({ x, y }, now, cfg));
        state.lastMineSpawnAt = now;
        return;
    }
}
function maybeAdvanceLevel(state) {
    if (state.asteroids.length > 0 || !state.ship)
        return;
    state.level += 1;
    const levelConfig = resolveLevelConfig(state.config.progressionBands, state.level, state.sessionId);
    state.asteroidCount = levelConfig.asteroidCount;
    state.config.maxLives = levelConfig.maxLives;
    state.bullets = [];
    state.pills = [];
    state.tokens = [];
    state.shipPickups = [];
    state.powerupPickups = [];
    state.mines = [];
    state.asteroids = spawnAsteroids(state.screen, state.asteroidCount, state.ship, state.config, state.level, state.sessionId);
}
function maybeSpawnPickups(state, now) {
    const cfg = state.config;
    if (state.pillsSpawned < state.pillsPerGameCap &&
        now - state.lastPillSpawnAt >= cfg.pillSpawnDelayMs) {
        state.pills.push(createEdgePickup("pill", state.screen, ASTRDS_PILL_COLOR, now, cfg));
        state.lastPillSpawnAt = now;
        state.pillsSpawned += 1;
    }
    if (now - state.lastTokenSpawnAt >= cfg.tokenSpawnDelayMs) {
        const pool = chooseWeightedPool(state.spaceTokenPools);
        const shouldRequestSpaceToken = Boolean(pool) && Math.random() < cfg.spaceTokenSpawnChance;
        if (pool && shouldRequestSpaceToken) {
            state.events.push({
                type: "spaceTokenSpawnRequested",
                pool,
            });
        }
        state.lastTokenSpawnAt = now;
    }
    const levelConfig = resolveLevelConfig(cfg.progressionBands, state.level, state.sessionId);
    const shipAlreadySpawned = state.shipPickupSpawnedLevels.includes(state.level);
    if (levelConfig.shipPickupAllowed &&
        !shipAlreadySpawned &&
        state.shipPickups.length < cfg.maxShipPickupsOnScreen &&
        now - state.lastShipPickupSpawnAt >= cfg.shipPickupSpawnDelayMs) {
        state.shipPickups.push(createEdgePickup("shipPickup", state.screen, "#87CEEB", now, cfg));
        state.shipPickupSpawnedLevels.push(state.level);
        state.lastShipPickupSpawnAt = now;
    }
    const powerupsSpawned = state.powerupsSpawnedByLevel[state.level] ?? 0;
    if (powerupsSpawned < levelConfig.powerupBudget &&
        state.powerupPickups.length < cfg.maxPowerupsOnScreen &&
        now - state.lastPowerupSpawnAt >= cfg.powerupSpawnDelayMs) {
        state.powerupPickups.push(createEdgePickup("powerup", state.screen, COMBO_POWERUP_COLOR, now, cfg));
        state.powerupsSpawnedByLevel[state.level] = powerupsSpawned + 1;
        state.lastPowerupSpawnAt = now;
    }
}
export function updateSimulation(state, dt, now = Date.now()) {
    if (state.status === "gameOver")
        return;
    state.tick += 1;
    state.events = [];
    updatePowerups(state, now);
    updateShip(state, dt, now);
    updateAsteroids(state, dt);
    updateBullets(state, dt, now);
    state.pills = updatePickups(state.pills, state.screen, dt, now);
    state.tokens = updateTokenPickups(state.tokens, state.screen, dt, now);
    state.shipPickups = updatePickups(state.shipPickups, state.screen, dt, now);
    state.powerupPickups = updatePickups(state.powerupPickups, state.screen, dt, now);
    maybeShootBullet(state, now);
    resolveBulletAsteroidCollisions(state);
    state.pills = resolveShipPickupCollision(state, state.pills, () => {
        state.pillsCollected += 1;
        state.events.push({ type: "pillCollected" });
    });
    if (state.ship) {
        state.powerupPickups = state.powerupPickups.filter((pickup) => {
            if (!checkCollision(state.ship, pickup))
                return true;
            if (pickup.color === SHIELD_PICKUP_COLOR) {
                state.powerups = {
                    ...state.powerups,
                    invincible: true,
                    expiresAt: now + state.config.powerupDurationMs,
                };
            }
            else if (pickup.color === RAPID_FIRE_PICKUP_COLOR) {
                state.powerups = {
                    ...state.powerups,
                    rapidFire: true,
                    expiresAt: now + state.config.powerupDurationMs,
                };
            }
            else {
                state.powerups = {
                    invincible: true,
                    rapidFire: true,
                    expiresAt: now + state.config.powerupDurationMs,
                };
            }
            return false;
        });
    }
    state.tokens = resolveShipTokenCollision(state);
    state.shipPickups = resolveShipPickupCollision(state, state.shipPickups, () => {
        state.lives = Math.min(state.config.maxLives, state.lives + 1);
        state.events.push({ type: "shipPickupCollected" });
    });
    handleShipAsteroidCollisions(state, now);
    resolveBulletMineCollisions(state);
    updateMines(state, now);
    maybeAdvanceLevel(state);
    maybeSpawnPickups(state, now);
    maybeSpawnMines(state, now);
}
export function resizeSimulation(state, screen) {
    state.screen = { ...screen };
    if (state.ship) {
        state.ship.position.x = Math.min(state.ship.position.x, screen.width);
        state.ship.position.y = Math.min(state.ship.position.y, screen.height);
    }
}
export function drainSimulationEvents(state) {
    const events = state.events;
    state.events = [];
    return events;
}
export function setSpaceTokenPools(state, pools) {
    state.spaceTokenPools = pools.map((pool) => ({ ...pool }));
}
export function setEmissionTier(state, tier) {
    state.emissionTier = { ...tier };
    state.pillsPerGameCap = tier.pillsPerGame;
}
export function applySimulationConfig(state, config) {
    state.config = { ...DEFAULT_SIMULATION_CONFIG, ...config };
    const levelConfig = resolveLevelConfig(state.config.progressionBands, state.level, state.sessionId);
    state.config.maxLives = levelConfig.maxLives;
    state.lives = Math.min(state.lives, state.config.maxLives);
    if (state.ship)
        state.ship.radius = state.config.shipRadius;
}
export function injectAuthorizedSpaceToken(state, spawn, now = Date.now()) {
    state.tokens.push(createTokenPickup(state.screen, now, spawn.color, {
        spawnId: spawn.spawnId,
        depositId: spawn.depositId,
        mintAddress: spawn.mintAddress,
    }));
}
export function simulationToSnapshot(state) {
    return {
        sessionId: state.sessionId,
        tick: state.tick,
        status: state.status,
        screen: { ...state.screen },
        score: state.score,
        level: state.level,
        lives: state.lives,
        pillsCollected: state.pillsCollected,
        tokensCollected: state.tokensCollected,
        ship: state.ship
            ? {
                id: state.ship.id,
                position: { ...state.ship.position },
                velocity: { ...state.ship.velocity },
                rotation: state.ship.rotation,
                radius: state.ship.radius,
                isInvulnerable: state.ship.isInvulnerable,
                isThrusting: state.ship.isThrusting,
            }
            : null,
        asteroids: state.asteroids.map((asteroid) => ({
            id: asteroid.id,
            position: { ...asteroid.position },
            velocity: { ...asteroid.velocity },
            rotation: asteroid.rotation,
            radius: asteroid.radius,
            score: asteroid.score,
            vertices: asteroid.vertices.map((vertex) => ({ ...vertex })),
        })),
        bullets: state.bullets.map((bullet) => ({
            id: bullet.id,
            position: { ...bullet.position },
            velocity: { ...bullet.velocity },
            rotation: bullet.rotation,
            radius: bullet.radius,
            power: bullet.power,
            color: bullet.color,
        })),
        pills: state.pills.map((pickup) => ({
            id: pickup.id,
            kind: pickup.kind,
            position: { ...pickup.position },
            velocity: { ...pickup.velocity },
            rotation: pickup.rotation,
            radius: pickup.radius,
            color: pickup.color,
        })),
        tokens: state.tokens.map((pickup) => ({
            id: pickup.id,
            kind: pickup.kind,
            position: { ...pickup.position },
            velocity: { ...pickup.velocity },
            rotation: pickup.rotation,
            radius: pickup.radius,
            color: pickup.color,
            spawnId: pickup.spawnId,
            depositId: pickup.depositId,
            mintAddress: pickup.mintAddress,
        })),
        shipPickups: state.shipPickups.map((pickup) => ({
            id: pickup.id,
            kind: pickup.kind,
            position: { ...pickup.position },
            velocity: { ...pickup.velocity },
            rotation: pickup.rotation,
            radius: pickup.radius,
            color: pickup.color,
        })),
        powerupPickups: state.powerupPickups.map((pickup) => ({
            id: pickup.id,
            kind: pickup.kind,
            position: { ...pickup.position },
            velocity: { ...pickup.velocity },
            rotation: pickup.rotation,
            radius: pickup.radius,
            color: pickup.color,
        })),
        emissionTier: { ...state.emissionTier },
        powerups: { ...state.powerups },
        mines: state.mines.map((mine) => ({
            id: mine.id,
            position: { ...mine.position },
            radius: mine.radius,
            blastRadius: mine.blastRadius,
            armed: mine.armed,
            armProgress: mine.armProgress,
        })),
    };
}
