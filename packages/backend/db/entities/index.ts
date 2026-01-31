import { Service } from "electrodb";
import { GameEntity } from "./game.entity";
import { PlayerEntity } from "./player.entity";
import { CharacterEntity } from "./character.entity";

// Create ElectroDB service with all entities
export const OthershipService = new Service({
  game: GameEntity,
  player: PlayerEntity,
  character: CharacterEntity,
});

export { GameEntity, PlayerEntity, CharacterEntity };
