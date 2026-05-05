export function checkCollision(a, b) {
    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;
    return Math.sqrt(dx * dx + dy * dy) < a.radius + b.radius;
}
export function segmentCircleCollision(start, end, circle) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
        const sx = start.x - circle.position.x;
        const sy = start.y - circle.position.y;
        return sx * sx + sy * sy <= circle.radius * circle.radius;
    }
    const t = Math.max(0, Math.min(1, ((circle.position.x - start.x) * dx +
        (circle.position.y - start.y) * dy) /
        lenSq));
    const closestX = start.x + dx * t;
    const closestY = start.y + dy * t;
    const cx = closestX - circle.position.x;
    const cy = closestY - circle.position.y;
    return cx * cx + cy * cy <= circle.radius * circle.radius;
}
export function bulletHitsAsteroid(bullet, asteroid, bulletCollisionPadding) {
    // Asteroid vertices intentionally jitter beyond the nominal radius. Use a swept
    // circle test with a little forgiveness so fast bullets don't tunnel through
    // and hits match what the player sees on the irregular outline.
    const visualRadius = asteroid.radius * 1.25 + bullet.radius + bulletCollisionPadding;
    return segmentCircleCollision(bullet.previousPosition, bullet.position, {
        position: asteroid.position,
        radius: visualRadius,
    });
}
