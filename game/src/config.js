// Lantern Thief — shared tuning numbers for the whole game.
// One place holds every constant so the level, the guards and the
// renderer all agree on tile size, speeds, sight and sound ranges.
export const TILE = 32;
export const COLS = 40;
export const ROWS = 22;
export const VIEW_W = COLS * TILE; // 1280
export const VIEW_H = ROWS * TILE; // 704
export const HUD_H = 16;

export const PLAYER_WALK_SPEED = 150; // pixels per second
export const PLAYER_RUN_SPEED = 235;
export const PLAYER_RADIUS = 11;

export const GUARD_PATROL_SPEED = 62;
export const GUARD_SUSPICIOUS_SPEED = 95;
export const GUARD_CHASE_SPEED = 168;
export const GUARD_RADIUS = 12;

// Vision cone: how far a guard sees and how wide the cone opens.
export const SIGHT_RANGE = 185;
export const SIGHT_HALF_ANGLE = 0.61; // ~35 degrees each side
export const SIGHT_RANGE_DARK = 95; // a thief crouched in shadow is harder to spot

// Detection meter: 0 = unseen, 1 = spotted. Fills while a guard has a
// clear look at the thief, drains when nobody does.
export const DETECT_FILL_RATE = 1.15; // per second of clear sight
export const DETECT_FILL_RATE_SHADOW = 0.35;
export const DETECT_DRAIN_RATE = 0.55;
export const ALARM_AT = 1.0;

// Noise: running is loud, walking is quiet. Guards investigate noises
// inside their hearing radius.
export const NOISE_WALK_RADIUS = 26;
export const NOISE_RUN_RADIUS = 130;
export const HEAR_RADIUS = 150;

// How long a guard keeps hunting after losing sight of the thief.
export const SEARCH_TIME = 6.0;
export const SUSPICIOUS_TIME = 2.2;

export const RELICS_TO_WIN = 3;
export const PAR_TIME_SECONDS = 150;
