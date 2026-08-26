export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const GROUND_Y = 660;

export const CORE_X = 150;
export const CORE_Y = 610;

export const PLAYER_SPAWN_X = 230;
export const PLAYER_SPAWN_Y = 620;

export const ZOMBIE_SPAWN_X = 1220;

export const PLAYER_MIN_X = 60;
export const PLAYER_MAX_X = 720;
export const PLAYER_SPEED = 220;

export const COLLISION = {
  PLAYER: 0x0001,
  ZOMBIE: 0x0002,
  PLAYER_BULLET: 0x0004,
  ZOMBIE_BULLET: 0x0008,
  BUILD_OBJECT: 0x0010,
  CORE: 0x0020,
  GROUND: 0x0040,
  ALL: 0xffffffff,
} as const;

export const BULLET_MAX_RICOCHETS = 3;
export const BULLET_LIFETIME_MS = 5000;
export const BULLET_CLEANUP_MARGIN = 100;
export const MAX_ACTIVE_BULLETS = 700;

export const BUILD_ZONE = {
  x: 80,
  y: 80,
  width: 620,
  height: 580,
};

export const PLAYER_SPAWN_ZONE = {
  x: 190,
  y: 570,
  width: 80,
  height: 90,
};

export const CORE_RECT = {
  x: CORE_X - 45,
  y: CORE_Y - 45,
  width: 90,
  height: 90,
};

export const SUPPORT_EPSILON = 4;
export const CHAIN_MAX_LENGTH = 220;
export const CHAIN_MAX_HP = 80;
export const MAX_BODY_VELOCITY = 1800;

export const CRUSH_MIN_VY = 200;
export const CRUSH_COOLDOWN_MS = 250;
export const CRUSH_SPEED_THRESHOLD = 150;
export const CRUSH_DAMAGE_FACTOR = 0.05;
export const CRUSH_DAMAGE_MAX = 2500;

export const GROUND_HEIGHT = GAME_HEIGHT - GROUND_Y;

export const MAX_WAVES = 5;

export const ITEMS_PER_LOOT = 6;