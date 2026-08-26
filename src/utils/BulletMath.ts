export interface Velocity {
  vx: number;
  vy: number;
}

export function velocityFromAngle(angleRad: number, speed: number): Velocity {
  return { vx: Math.cos(angleRad) * speed, vy: Math.sin(angleRad) * speed };
}

export function jitteredAngle(angleRad: number, spreadDeg: number): number {
  return angleRad + (Math.random() * 2 - 1) * ((spreadDeg * Math.PI) / 180);
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
  maxRicochets: number;
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

export function applyRicochet(params: RicochetParams): RicochetResult {
  const reflected = reflectVelocity(params.vx, params.vy, params.nx, params.ny);
  const speed = Math.hypot(reflected.vx, reflected.vy) * 0.8;
  const ricochetCount = params.ricochetCount + 1;
  return {
    reflected,
    speed,
    damage: params.damage * 0.85,
    ricochetCount,
    canDamageZombies: params.owner === 'zombie' ? true : params.canDamageZombies,
  };
}