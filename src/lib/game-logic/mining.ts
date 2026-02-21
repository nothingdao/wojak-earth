/**
 * Shared character stats required for mining calculations.
 */
export interface MiningCharacterStats {
  level: number
  health: number
  experience: number
}

/**
 * Calculates energy cost to perform one mining action.
 * Mirrors existing frontend and backend behavior.
 */
export function getMiningEnergyCost(character: MiningCharacterStats): number {
  const baseCost = 10

  // Higher level characters are more efficient (lower cost).
  const efficiencyReduction = Math.floor(character.level / 5)

  // Health affects how much energy actions consume.
  const healthMultiplier = character.health < 50 ? 1.5 : 1.0

  return Math.max(Math.floor((baseCost - efficiencyReduction) * healthMultiplier), 5)
}

/**
 * Calculates the dynamic max energy (power core capacity) for a character.
 * Mirrors existing frontend and backend behavior.
 */
export function getPowerCoreCapacity(character: MiningCharacterStats): number {
  // Base power core capacity.
  const basePowerCore = 100

  // Level upgrades (tech improvements).
  const techUpgrades = character.level * 15

  // Health affects power efficiency (damaged systems = less capacity).
  const healthEfficiency = (character.health / 100) * 50

  // Experience represents optimization knowledge.
  const optimizationBonus = Math.min(character.experience / 100, 50)

  return Math.floor(basePowerCore + techUpgrades + healthEfficiency + optimizationBonus)
}
