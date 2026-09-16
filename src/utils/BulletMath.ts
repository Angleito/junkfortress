import { RICOCHET_DAMAGE_DECAY, RICOCHET_SPEED_DECAY } from './Constants';
import { nextRng } from './rng';

export interface Velocity {
 vx: number;
 vy: number;
}

export function velocityFromAngle(angleRad: number, speed: number): Velocity {
 return { vx: Math.cos(angleRad) * speed, vy: Math.sin(angleRad) * speed };
}

export function jitteredAngle(angleRad: number, spreadDeg: number): number {
 return angleRad + (nextRng() * 2 - 1) * ((spreadDeg * Math.PI) / 180);
}

export function reflectVelocity(vx: number, vy: number, nx: number, ny: number): Velocity {
 const dot = vx * nx + vy * ny;
 return { vx: vx - 2 * dot * nx, vy: vy - 2 * dot * ny };
}

export interface RicochetParams {
 vx: number;
 vy: number;
 nx: number;
 ny: number;
 damage: number;
 ricochetCount: number;
 owner: 'player' | 'zombie';
 canDamageZombies: boolean;
}

export interface RicochetResult {
 reflected: Velocity;
 speed: number;
 damage: number;
 ricochetCount: number;
 canDamageZombies: boolean;
}

/**
 * Invariant: `reflected` is the raw r = v - 2(v.n)n reflection and `speed` is the
 * post-decay magnitude of that velocity. Callers normalize `reflected` and scale it
 * by `speed`, so the outgoing direction is exact and only the magnitude is damped.
 */
export function applyRicochet(params: RicochetParams): RicochetResult {
 const reflected = reflectVelocity(params.vx, params.vy, params.nx, params.ny);
 return {
  reflected,
  speed: Math.hypot(reflected.vx, reflected.vy) * RICOCHET_SPEED_DECAY,
  damage: params.damage * RICOCHET_DAMAGE_DECAY,
  ricochetCount: params.ricochetCount + 1,
  canDamageZombies: params.canDamageZombies || params.owner === 'zombie',
 };
}
