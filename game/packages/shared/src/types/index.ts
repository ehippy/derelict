// Core type definitions for Othership

export interface CharacterStats {
  strength: number;
  speed: number;
  intellect: number;
  combat: number;
  social: number;
}

export interface CharacterSaves {
  sanity: number;
  fear: number;
  body: number;
}

export interface Character {
  id: string;
  playerId: string;
  name: string;
  stats: CharacterStats;
  saves: CharacterSaves;
  stress: number;
  health: number;
  inventory: string[];
  status: 'active' | 'rip';
}

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  type: 'npc' | 'monster' | 'item' | 'object';
  position: Position;
  name: string;
}

export interface Player {
  id: string;
  discordId: string;
  username: string;
  characterIds: string[];
}

export interface Game {
  id: string;
  serverId: string;
  channelId: string;
  status: 'setup' | 'active' | 'paused' | 'completed';
  turnNumber: number;
  playerIds: string[];
}
