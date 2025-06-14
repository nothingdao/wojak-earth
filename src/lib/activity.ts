export function calculateActivityDelay(baseInterval: number): number {
  // Add some randomness to the delay
  const jitter = Math.random() * 0.5 + 0.75 // Random value between 0.75 and 1.25
  return Math.floor(baseInterval * jitter)
}
