// Game logic and mechanics

export * from './skills';

/**
 * Roll a die with the specified number of sides
 */
export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Perform a stat check (roll under stat value on d100)
 */
export function statCheck(statValue: number): { success: boolean; roll: number } {
  const roll = rollDie(100);
  return {
    success: roll <= statValue,
    roll,
  };
}

/**
 * Alias for statCheck with critical success/failure
 */
export function rollCheck(roll: number, statValue: number): { success: boolean; critical: boolean } {
  const success = roll <= statValue;
  const critical = roll <= 5 || roll >= 95;
  return { success, critical };
}

/**
 * Roll multiple dice and return sum
 */
export function rollDice(sides: number, count: number = 1): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += rollDie(sides);
  }
  return total;
}

/**
 * Calculate if a panic check is triggered based on current stress
 */
export function shouldTriggerPanic(stress: number, threshold: number = 5): boolean {
  return stress >= threshold;
}


export function getSkillTree() {
  return {
    "tiers": {
      "trained": { "bonus": 10 },
      "expert": { "bonus": 15 },
      "master": { "bonus": 20 }
    },
    "skills": [
      { "id": "linguistics", "name": "Linguistics", "tier": "trained", "unlocks": ["psychology"] },
      { "id": "zoology", "name": "Zoology", "tier": "trained", "unlocks": ["psychology", "pathology"] },
      { "id": "botany", "name": "Botany", "tier": "trained", "unlocks": ["pathology", "field_medicine", "ecology"] },
      { "id": "geology", "name": "Geology", "tier": "trained", "unlocks": ["ecology", "asteroid_mining"] },
      { "id": "industrial_equipment", "name": "Industrial Equipment", "tier": "trained", "unlocks": ["mechanical_repair"] },
      { "id": "jury_rigging", "name": "Jury-Rigging", "tier": "trained", "unlocks": ["mechanical_repair", "explosives"] },
      { "id": "chemistry", "name": "Chemistry", "tier": "trained", "unlocks": ["pharmacology", "explosives"] },
      { "id": "computers", "name": "Computers", "tier": "trained", "unlocks": ["hacking"] },
      { "id": "zero_g", "name": "Zero-G", "tier": "trained", "unlocks": ["piloting"] },
      { "id": "mathematics", "name": "Mathematics", "tier": "trained", "unlocks": ["physics"] },
      { "id": "art", "name": "Art", "tier": "trained", "unlocks": ["mysticism"] },
      { "id": "archaeology", "name": "Archaeology", "tier": "trained", "unlocks": ["mysticism"] },
      { "id": "theology", "name": "Theology", "tier": "trained", "unlocks": ["mysticism"] },
      { "id": "military_training", "name": "Military Training", "tier": "trained", "unlocks": ["firearms", "hand_to_hand_combat"] },
      { "id": "rimwise", "name": "Rimwise", "tier": "trained", "unlocks": ["wilderness_survival"] },
      { "id": "athletics", "name": "Athletics", "tier": "trained", "unlocks": ["hand_to_hand_combat"] },

      { "id": "psychology", "name": "Psychology", "tier": "expert", "unlocked_by": ["linguistics", "zoology"], "unlocks": ["sophontology"] },
      { "id": "pathology", "name": "Pathology", "tier": "expert", "unlocked_by": ["zoology", "botany"], "unlocks": ["exobiology"] },
      { "id": "field_medicine", "name": "Field Medicine", "tier": "expert", "unlocked_by": ["botany"], "unlocks": ["surgery"] },
      { "id": "ecology", "name": "Ecology", "tier": "expert", "unlocked_by": ["botany", "geology"], "unlocks": ["planetology"] },
      { "id": "asteroid_mining", "name": "Asteroid Mining", "tier": "expert", "unlocked_by": ["geology"], "unlocks": ["planetology"] },
      { "id": "mechanical_repair", "name": "Mechanical Repair", "tier": "expert", "unlocked_by": ["industrial_equipment", "jury_rigging"], "unlocks": ["engineering"] },
      { "id": "explosives", "name": "Explosives", "tier": "expert", "unlocked_by": ["jury_rigging", "chemistry"], "unlocks": ["cybernetics"] },
      { "id": "pharmacology", "name": "Pharmacology", "tier": "expert", "unlocked_by": ["chemistry"], "unlocks": ["artificial_intelligence"] },
      { "id": "hacking", "name": "Hacking", "tier": "expert", "unlocked_by": ["computers"], "unlocks": ["artificial_intelligence"] },
      { "id": "piloting", "name": "Piloting", "tier": "expert", "unlocked_by": ["zero_g"], "unlocks": ["hyperspace"] },
      { "id": "physics", "name": "Physics", "tier": "expert", "unlocked_by": ["mathematics"], "unlocks": ["hyperspace"] },
      { "id": "mysticism", "name": "Mysticism", "tier": "expert", "unlocked_by": ["art", "archaeology", "theology"], "unlocks": ["xenoesotericism"] },
      { "id": "wilderness_survival", "name": "Wilderness Survival", "tier": "expert", "unlocked_by": ["rimwise"], "unlocks": ["command"] },
      { "id": "firearms", "name": "Firearms", "tier": "expert", "unlocked_by": ["military_training"], "unlocks": ["command"] },
      { "id": "hand_to_hand_combat", "name": "Hand-to-Hand Combat", "tier": "expert", "unlocked_by": ["military_training", "athletics"], "unlocks": ["command"] },

      { "id": "sophontology", "name": "Sophontology", "tier": "master", "unlocked_by": ["psychology"] },
      { "id": "exobiology", "name": "Exobiology", "tier": "master", "unlocked_by": ["pathology"] },
      { "id": "surgery", "name": "Surgery", "tier": "master", "unlocked_by": ["field_medicine"] },
      { "id": "planetology", "name": "Planetology", "tier": "master", "unlocked_by": ["ecology", "asteroid_mining"] },
      { "id": "robotics", "name": "Robotics", "tier": "master", "unlocked_by": ["engineering"] },
      { "id": "engineering", "name": "Engineering", "tier": "master", "unlocked_by": ["mechanical_repair"] },
      { "id": "cybernetics", "name": "Cybernetics", "tier": "master", "unlocked_by": ["explosives"] },
      { "id": "artificial_intelligence", "name": "Artificial Intelligence", "tier": "master", "unlocked_by": ["pharmacology", "hacking"] },
      { "id": "hyperspace", "name": "Hyperspace", "tier": "master", "unlocked_by": ["piloting", "physics"] },
      { "id": "xenoesotericism", "name": "Xenoesotericism", "tier": "master", "unlocked_by": ["mysticism"] },
      { "id": "command", "name": "Command", "tier": "master", "unlocked_by": ["wilderness_survival", "firearms", "hand_to_hand_combat"] }
    ]
  }
}