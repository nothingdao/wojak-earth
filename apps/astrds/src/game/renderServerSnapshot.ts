import type {
  AsteroidSnapshot,
  GameSnapshot,
  MineSnapshot,
  PickupSnapshot,
  ShipSnapshot,
} from "@shared/game/protocol";
import { getCanvasTokens, resolveCanvasColor } from "@/lib/designTokens";

function drawShip(ctx: CanvasRenderingContext2D, ship: ShipSnapshot): void {
  const colors = getCanvasTokens();
  ctx.save();
  ctx.translate(ship.position.x, ship.position.y);

  if (ship.isInvulnerable) {
    ctx.shadowColor = colors.shipGlow;
    ctx.shadowBlur = 10;
    const pulseScale = 1 + Math.sin(Date.now() / 200) * 0.1;
    ctx.scale(pulseScale, pulseScale);
  }

  ctx.rotate((ship.rotation * Math.PI) / 180);
  ctx.strokeStyle = colors.shipStroke;
  ctx.fillStyle = colors.shipFill;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(10, 10);
  ctx.lineTo(5, 7);
  ctx.lineTo(-5, 7);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawAsteroid(
  ctx: CanvasRenderingContext2D,
  asteroid: AsteroidSnapshot
): void {
  const colors = getCanvasTokens();
  ctx.save();
  ctx.translate(asteroid.position.x, asteroid.position.y);
  ctx.rotate((asteroid.rotation * Math.PI) / 180);
  ctx.strokeStyle = colors.asteroidStroke;
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(0, -asteroid.radius);
  for (let i = 1; i < asteroid.vertices.length; i += 1) {
    ctx.lineTo(asteroid.vertices[i].x, asteroid.vertices[i].y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawMine(ctx: CanvasRenderingContext2D, mine: MineSnapshot): void {
  ctx.save();
  ctx.translate(mine.position.x, mine.position.y);

  const t = mine.armProgress;
  const pulseHz = mine.armed ? 2 + t * 10 : 0;
  const pulse = mine.armed ? Math.sin((Date.now() / 1000) * pulseHz * Math.PI * 2) : 0;
  const r = mine.radius * (1 + pulse * 0.25);

  const color = mine.armed
    ? t > 0.65
      ? `hsl(${10 - t * 10}, 100%, ${50 + t * 20}%)`
      : `hsl(${45 - t * 35}, 100%, 55%)`
    : "#556";

  const glow = mine.armed ? 6 + t * 18 : 0;
  if (glow > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
  }

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;

  // Central sphere
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
  ctx.globalAlpha = mine.armed ? 0.35 + t * 0.35 : 0.25;
  ctx.fill();
  ctx.globalAlpha = mine.armed ? 0.7 + t * 0.3 : 0.5;
  ctx.stroke();

  // 8 spikes
  const spikeCount = 8;
  const spikeLen = r * 0.85;
  ctx.globalAlpha = mine.armed ? 0.8 + t * 0.2 : 0.55;
  for (let i = 0; i < spikeCount; i++) {
    const angle = (i / spikeCount) * Math.PI * 2;
    const baseX = Math.cos(angle) * r * 0.5;
    const baseY = Math.sin(angle) * r * 0.5;
    const tipX = Math.cos(angle) * (r * 0.5 + spikeLen);
    const tipY = Math.sin(angle) * (r * 0.5 + spikeLen);
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPickup(
  ctx: CanvasRenderingContext2D,
  pickup: PickupSnapshot
): void {
  const colors = getCanvasTokens();
  const pickupColor = resolveCanvasColor(pickup.color);
  ctx.save();
  ctx.translate(pickup.position.x, pickup.position.y);

  if (pickup.kind === "shipPickup") {
    ctx.beginPath();
    ctx.arc(0, 0, pickup.radius - 5, 0, Math.PI * 2);
    ctx.fillStyle = pickupColor;
    ctx.fill();
    ctx.strokeStyle = colors.shipPickupStroke;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 10;
    ctx.shadowColor = colors.shipPickupStroke;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = colors.shipPickupInner;
    ctx.beginPath();
    ctx.moveTo(0, -19.5);
    ctx.lineTo(13, 13);
    ctx.lineTo(6.5, 9.1);
    ctx.lineTo(-6.5, 9.1);
    ctx.lineTo(-13, 13);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (pickup.kind === "powerup") {
    const pulse = 1 + Math.sin(Date.now() / 300) * 0.15;
    ctx.scale(pulse, pulse);
    ctx.rotate(Math.PI / 4);
    const s = pickup.radius * 0.8;
    ctx.strokeStyle = pickupColor;
    ctx.shadowColor = pickupColor;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.strokeRect(-s, -s, s * 2, s * 2);
    ctx.restore();
    return;
  }

  ctx.strokeStyle = pickupColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, pickup.radius, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

export function renderServerSnapshot(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  ratio: number
): void {
  ctx.save();
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const colors = getCanvasTokens();
  ctx.fillStyle = colors.backgroundAlpha;
  ctx.fillRect(0, 0, snapshot.screen.width, snapshot.screen.height);

  if (snapshot.ship) {
    drawShip(ctx, snapshot.ship);
  }

  snapshot.asteroids.forEach((asteroid) => drawAsteroid(ctx, asteroid));

  snapshot.bullets.forEach((bullet) => {
    ctx.save();
    ctx.translate(bullet.position.x, bullet.position.y);
    ctx.rotate((bullet.rotation * Math.PI) / 180);
    const bulletColor = resolveCanvasColor(bullet.color);
    ctx.fillStyle = bulletColor;
    ctx.beginPath();
    ctx.arc(0, 0, bullet.radius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    if (bullet.power > 1) {
      ctx.shadowColor = bulletColor;
      ctx.shadowBlur = bullet.power * 2;
      ctx.fill();
    }
    ctx.restore();
  });

  snapshot.mines.forEach((mine) => drawMine(ctx, mine));
  snapshot.pills.forEach((pickup) => drawPickup(ctx, pickup));
  snapshot.tokens.forEach((pickup) => drawPickup(ctx, pickup));
  snapshot.shipPickups.forEach((pickup) => drawPickup(ctx, pickup));
  snapshot.powerupPickups.forEach((pickup) => drawPickup(ctx, pickup));

  ctx.restore();
}
