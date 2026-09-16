import Phaser from 'phaser';
import {
  BULLET_CLEANUP_MARGIN,
  BULLET_LIFETIME_MS,
  BULLET_MAX_RICOCHETS,
  CHAIN_SEGMENT_THICKNESS,
  CORE_RECT,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_Y,
  MAX_ACTIVE_BULLETS,
} from '../utils/Constants';
import { WEAPONS } from '../data/gameData';
import { MATERIAL_DAMAGE_MULTIPLIER, type Material } from '../data/items';
import { applyRicochet, jitteredAngle, velocityFromAngle } from '../utils/BulletMath';
import { runStore } from '../state/runStore';
import { sfx } from '../systems/Audio';
import type { Effects } from '../systems/Effects';
import type { WaveStructureManager } from '../systems/WaveStructureManager';
import type { Zombie } from './Zombie';

export interface BulletSnapshot {
  owner: 'player' | 'zombie';
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  ricochetCount: number;
  canDamageZombies: boolean;
}

export interface BulletHandlers {
  onPlayerHit?: (amount: number, x: number, y: number) => void;
  onCoreHit?: (amount: number, x: number, y: number) => void;
  zombies?: () => readonly Zombie[];
  playerBody?: () => Phaser.Physics.Matter.Image | null;
}

interface BulletData {
  owner: 'player' | 'zombie';
  damage: number;
  ricochetCount: number;
  maxRicochets: number;
  canDamageZombies: boolean;
  vx: number;
  vy: number;
}

interface BulletEntry {
  img: Phaser.GameObjects.Image;
  data: BulletData;
  alive: boolean;
  spawnTime: number;
  prevX: number;
  prevY: number;
  lastHitId: string;
  lastHitAt: number;
}

type HitKind = 'none' | 'object' | 'chain' | 'zombie' | 'player' | 'core' | 'ground';

const BULLET_DEPTH = 30;
const TRACER_COLOR = 0xffd070;
const FLASH_PLAYER = 0xffb040;
const FLASH_ZOMBIE = 0xff9a4d;
const ARMED_TINT = 0x7cff9c;
const ARMED_SCALE = 1.35;
const FLASH_THROTTLE_MS = 40;
const HIT_SUPPRESS_MS = 60; // K1: never re-resolve the surface just bounced off.
const NUDGE_PX = 2;
const MIN_SPEED = 40;
const BULLET_HALF_THICKNESS = 2;
const CHAIN_SWEEP_RADIUS = CHAIN_SEGMENT_THICKNESS / 2 + BULLET_HALF_THICKNESS;
const PLAYER_HALF_W = 10;
const PLAYER_HALF_H = 19;
/** Ricochet juice: a bright burst plus a short stub along the new path. */
const RICOCHET_SPARKS = 12;
const RICOCHET_STUB = 84;
const EPS = 1e-6;

const NO_ZOMBIES: readonly Zombie[] = [];

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export class BulletManager {
  spreadScale = 1;

  private readonly scene: Phaser.Scene;
  private readonly structures: WaveStructureManager;
  private readonly effects: Effects;
  private readonly handlers: BulletHandlers;
  private readonly pool: BulletEntry[] = [];
  private readonly snapshots: BulletSnapshot[] = [];
  private readonly coreCx = CORE_RECT.x + CORE_RECT.width / 2;
  private readonly coreCy = CORE_RECT.y + CORE_RECT.height / 2;
  private readonly coreHx = CORE_RECT.width / 2;
  private readonly coreHy = CORE_RECT.height / 2;

  // Swept-query scratch, reused so the per-frame path allocates nothing.
  private bestT = Infinity;
  private hitNX = 0;
  private hitNY = 0;
  private hitId = '';
  private hitKind: HitKind = 'none';
  private hitMaterial: Material = 'wood';
  private hitZombie: Zombie | null = null;
  private lastPlayerFlashAt = -Infinity;
  private lastZombieFlashAt = -Infinity;

  constructor(
    scene: Phaser.Scene,
    opts: { structures: WaveStructureManager; effects: Effects; handlers: BulletHandlers; spreadScale?: number },
  ) {
    this.scene = scene;
    this.structures = opts.structures;
    this.effects = opts.effects;
    this.handlers = opts.handlers;
    if (opts.spreadScale !== undefined) this.spreadScale = opts.spreadScale;
  }

  firePlayer(x: number, y: number, angle: number): void {
    if (!this.fire(x, y, angle, 'player')) return;
    sfx.pistol();
    const now = this.scene.time.now;
    if (now - this.lastPlayerFlashAt < FLASH_THROTTLE_MS) return;
    this.lastPlayerFlashAt = now;
    this.effects.muzzleFlash(x, y, angle, FLASH_PLAYER);
  }

  fireZombie(x: number, y: number, angle: number): void {
    if (!this.fire(x, y, angle, 'zombie')) return;
    runStore.recordBulletFired();
    sfx.zombieShot();
    const now = this.scene.time.now;
    if (now - this.lastZombieFlashAt < FLASH_THROTTLE_MS) return;
    this.lastZombieFlashAt = now;
    this.effects.muzzleFlash(x, y, angle, FLASH_ZOMBIE);
  }

  update(timeMs: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 33) / 1000;
    const margin = BULLET_CLEANUP_MARGIN;
    const zombies = this.handlers.zombies !== undefined ? this.handlers.zombies() : NO_ZOMBIES;
    const playerBody = this.handlers.playerBody !== undefined ? this.handlers.playerBody() : null;
    const playerX = playerBody === null ? 0 : playerBody.x;
    const playerY = playerBody === null ? 0 : playerBody.y;

    for (let i = 0; i < this.pool.length; i++) {
      const entry = this.pool[i];
      if (!entry.alive) continue;
      const data = entry.data;
      const stale = timeMs - entry.spawnTime >= BULLET_LIFETIME_MS;
      const spent = data.vx * data.vx + data.vy * data.vy < MIN_SPEED * MIN_SPEED;
      if (stale || spent) {
        this.kill(entry);
        continue;
      }

      const x0 = entry.prevX;
      const y0 = entry.prevY;
      const dx = data.vx * dt;
      const dy = data.vy * dt;
      this.findFirstHit(entry, timeMs, x0, y0, dx, dy, zombies, playerBody !== null, playerX, playerY);
      if (this.hitKind === 'none') {
        const x1 = x0 + dx;
        const y1 = y0 + dy;
        entry.img.setPosition(x1, y1);
        entry.prevX = x1;
        entry.prevY = y1;
      } else {
        // Exactly one resolution per bullet per frame, at the first surface crossed.
        this.resolveHit(entry, timeMs, x0, y0, x0 + dx * this.bestT, y0 + dy * this.bestT);
      }

      if (!entry.alive) continue;
      const px = entry.prevX;
      const py = entry.prevY;
      if (px < -margin || px > GAME_WIDTH + margin || py < -margin || py > GAME_HEIGHT + margin) this.kill(entry);
    }
  }

  activeCount(): number {
    let count = 0;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].alive) count += 1;
    }
    return count;
  }

  pooledCount(): number {
    return this.pool.length;
  }

  snapshot(): readonly BulletSnapshot[] {
    const out = this.snapshots;
    let n = 0;
    for (let i = 0; i < this.pool.length; i++) {
      const entry = this.pool[i];
      if (!entry.alive) continue;
      if (n === out.length) {
        out.push({ owner: 'player', x: 0, y: 0, vx: 0, vy: 0, damage: 0, ricochetCount: 0, canDamageZombies: false });
      }
      const snap = out[n];
      snap.owner = entry.data.owner;
      snap.x = entry.img.x; snap.y = entry.img.y;
      snap.vx = entry.data.vx; snap.vy = entry.data.vy;
      snap.damage = entry.data.damage; snap.ricochetCount = entry.data.ricochetCount;
      snap.canDamageZombies = entry.data.canDamageZombies;
      n += 1;
    }
    out.length = n;
    return out;
  }

  private fire(x: number, y: number, angle: number, owner: 'player' | 'zombie'): boolean {
    const entry = this.acquire();
    if (entry === null) return false; // pool exhausted: drop the shot silently

    const weapon = owner === 'player' ? WEAPONS.survivor_pistol : WEAPONS.zombie_pistol;
    const shotAngle = jitteredAngle(angle, weapon.spreadDeg * this.spreadScale);
    const velocity = velocityFromAngle(shotAngle, weapon.bulletSpeed);
    const armed = owner === 'player';

    // Every field is rewritten: a recycled entry must never leak the last shot.
    const data = entry.data;
    data.owner = owner; data.damage = weapon.damage; data.ricochetCount = 0;
    data.maxRicochets = BULLET_MAX_RICOCHETS; data.canDamageZombies = armed;
    data.vx = velocity.vx; data.vy = velocity.vy;
    entry.alive = true; entry.spawnTime = this.scene.time.now;
    entry.prevX = x; entry.prevY = y;
    entry.lastHitId = ''; entry.lastHitAt = -Infinity;

    const img = entry.img;
    img.setTexture(armed ? 'bullet-player' : 'bullet-zombie').clearTint();
    img.setAlpha(1).setScale(1).setRotation(shotAngle).setPosition(x, y).setVisible(true).setActive(true);
    return true;
  }

  private acquire(): BulletEntry | null {
    for (let i = 0; i < this.pool.length; i++) {
      const entry = this.pool[i];
      if (!entry.alive) return entry;
    }
    if (this.pool.length >= MAX_ACTIVE_BULLETS) return null;

    const img = this.scene.add.image(0, 0, 'bullet-player');
    img.setBlendMode(Phaser.BlendModes.ADD).setDepth(BULLET_DEPTH).setActive(false).setVisible(false);
    const data: BulletData = {
      owner: 'player',
      damage: 0,
      ricochetCount: 0,
      maxRicochets: BULLET_MAX_RICOCHETS,
      canDamageZombies: false,
      vx: 0,
      vy: 0,
    };
    const entry: BulletEntry = { img, data, alive: false, spawnTime: 0, prevX: 0, prevY: 0, lastHitId: '', lastHitAt: -Infinity };
    this.pool.push(entry);
    return entry;
  }

  private kill(entry: BulletEntry): void {
    entry.alive = false;
    entry.img.setVisible(false);
    entry.img.setActive(false);
  }

  private findFirstHit(
    entry: BulletEntry,
    timeMs: number,
    x0: number, y0: number, dx: number, dy: number,
    zombies: readonly Zombie[],
    hasPlayer: boolean,
    playerX: number, playerY: number,
  ): void {
    this.bestT = Infinity;
    this.hitKind = 'none';
    this.hitId = '';
    this.hitZombie = null;
    this.hitNX = 0;
    this.hitNY = 0;

    const data = entry.data;
    const lastHitId = entry.lastHitId;
    const suppressing = timeMs - entry.lastHitAt < HIT_SUPPRESS_MS;

    const targets = this.structures.getTargets();
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      if (suppressing && target.id === lastHitId) continue;
      const before = this.bestT;
      const angle = target.angle;
      const cos = angle === 0 ? 1 : Math.cos(angle);
      const sin = angle === 0 ? 0 : Math.sin(angle);
      this.boxSweep(x0, y0, dx, dy, target.x, target.y, target.width / 2, target.height / 2, cos, sin);
      if (this.bestT < before) { this.hitKind = 'object'; this.hitId = target.id; this.hitMaterial = target.material; }
    }

    const chains = this.structures.getChainSegments();
    for (let i = 0; i < chains.length; i++) {
      const chain = chains[i];
      if (suppressing && chain.id === lastHitId) continue;
      const before = this.bestT;
      this.chainSweep(x0, y0, dx, dy, chain.ax, chain.ay, chain.bx, chain.by);
      if (this.bestT < before) { this.hitKind = 'chain'; this.hitId = chain.id; }
    }

    // Zombie bullets pass through zombies until a metal/chain bounce arms them.
    if (data.canDamageZombies) {
      for (let i = 0; i < zombies.length; i++) {
        const zombie = zombies[i];
        if (!zombie.alive || !zombie.sprite.active) continue;
        const box = zombie.hitBox;
        const before = this.bestT;
        this.boxSweep(x0, y0, dx, dy, box.x, box.y, box.halfW, box.halfH, 1, 0);
        if (this.bestT < before) { this.hitKind = 'zombie'; this.hitZombie = zombie; }
      }
    }

    if (data.owner === 'zombie' && hasPlayer) {
      const before = this.bestT;
      this.boxSweep(x0, y0, dx, dy, playerX, playerY, PLAYER_HALF_W, PLAYER_HALF_H, 1, 0);
      if (this.bestT < before) this.hitKind = 'player';
    }

    const coreBefore = this.bestT;
    this.boxSweep(x0, y0, dx, dy, this.coreCx, this.coreCy, this.coreHx, this.coreHy, 1, 0);
    if (this.bestT < coreBefore) this.hitKind = 'core';

    let groundT = Infinity;
    if (y0 >= GROUND_Y) groundT = 0;
    else if (dy > EPS) groundT = (GROUND_Y - y0) / dy;
    if (groundT <= 1 && groundT < this.bestT) { this.bestT = groundT; this.hitKind = 'ground'; }
  }

  // Segment vs oriented box: slab test in the box's local frame, so the entry point
  // and the outward face normal come from the box's real plate angle.
  private boxSweep(
    x0: number, y0: number, dx: number, dy: number,
    cx: number, cy: number, hx: number, hy: number,
    cos: number, sin: number,
  ): void {
    const rx = x0 - cx;
    const ry = y0 - cy;
    const lx = cos * rx + sin * ry;
    const ly = -sin * rx + cos * ry;
    const ldx = cos * dx + sin * dy;
    const ldy = -sin * dx + cos * dy;
    let tEnter = -Infinity;
    let tExit = Infinity;
    let lnx = 0;
    let lny = 0;

    if (Math.abs(ldx) < EPS) {
      if (lx < -hx || lx > hx) return;
    } else {
      const sx = ldx > 0 ? 1 : -1;
      const tNear = (-hx * sx - lx) / ldx;
      const tFar = (hx * sx - lx) / ldx;
      if (tNear > tEnter) { tEnter = tNear; lnx = -sx; lny = 0; }
      if (tFar < tExit) tExit = tFar;
      if (tEnter > tExit) return;
    }

    if (Math.abs(ldy) < EPS) {
      if (ly < -hy || ly > hy) return;
    } else {
      const sy = ldy > 0 ? 1 : -1;
      const tNear = (-hy * sy - ly) / ldy;
      const tFar = (hy * sy - ly) / ldy;
      if (tNear > tEnter) { tEnter = tNear; lnx = 0; lny = -sy; }
      if (tFar < tExit) tExit = tFar;
      if (tEnter > tExit) return;
    }

    if (tExit < 0 || tEnter > 1 || tEnter >= this.bestT) return;
    if (tEnter < 0) {
      // Segment starts inside: bounce off the reverse of travel, never tunnel out.
      const len = Math.hypot(dx, dy);
      if (len < EPS) return;
      this.bestT = 0;
      this.hitNX = -dx / len;
      this.hitNY = -dy / len;
      return;
    }
    this.bestT = tEnter;
    this.hitNX = cos * lnx - sin * lny;
    this.hitNY = sin * lnx + cos * lny;
  }

  // Bullet segment vs chain capsule. The closest-approach parameter stands in for the
  // entry point; a chain is thinner than one frame of travel, so the error is invisible.
  private chainSweep(x0: number, y0: number, dx: number, dy: number, ax: number, ay: number, bx: number, by: number): void {
    const ex = bx - ax;
    const ey = by - ay;
    const rx = x0 - ax;
    const ry = y0 - ay;
    const a = dx * dx + dy * dy;
    const e = ex * ex + ey * ey;
    const c = dx * rx + dy * ry;
    const f = ex * rx + ey * ry;
    let s: number;
    let t: number;

    if (a < EPS) { s = 0; t = e < EPS ? 0 : clamp01(f / e); }
    else if (e < EPS) { t = 0; s = clamp01(-c / a); }
    else {
      const b = dx * ex + dy * ey;
      const denom = a * e - b * b;
      s = denom > EPS ? clamp01((b * f - c * e) / denom) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp01(-c / a); }
      else if (t > 1) { t = 1; s = clamp01((b - c) / a); }
    }

    if (s > 1 || s >= this.bestT) return;
    const ox = x0 + dx * s - (ax + ex * t);
    const oy = y0 + dy * s - (ay + ey * t);
    const distSq = ox * ox + oy * oy;
    if (distSq > CHAIN_SWEEP_RADIUS * CHAIN_SWEEP_RADIUS) return;
    const dist = Math.sqrt(distSq);
    this.bestT = s;
    if (dist > EPS) { this.hitNX = ox / dist; this.hitNY = oy / dist; return; }
    const len = Math.sqrt(a);
    this.hitNX = -dx / len;
    this.hitNY = -dy / len;
  }

  private resolveHit(entry: BulletEntry, timeMs: number, x0: number, y0: number, hitX: number, hitY: number): void {
    const data = entry.data;

    switch (this.hitKind) {
      case 'object': {
        const multiplier = MATERIAL_DAMAGE_MULTIPLIER[this.hitMaterial];
        this.structures.damageObject(this.hitId, data.damage * multiplier, { x: hitX, y: hitY });
        if (this.hitMaterial === 'wood') {
          this.effects.splinters(hitX, hitY);
          sfx.woodHit();
          this.kill(entry);
          return;
        }
        if (data.ricochetCount >= data.maxRicochets) {
          this.effects.sparks(hitX, hitY, this.hitNX, this.hitNY);
          sfx.metalHit();
          this.kill(entry);
          return;
        }
        this.ricochet(entry, timeMs, x0, y0, hitX, hitY);
        sfx.ricochet();
        return;
      }
      case 'chain': {
        this.structures.damageChain(this.hitId, data.damage * MATERIAL_DAMAGE_MULTIPLIER.metal, { x: hitX, y: hitY });
        if (data.ricochetCount >= data.maxRicochets) {
          this.effects.sparks(hitX, hitY, this.hitNX, this.hitNY, 4);
          sfx.metalHit();
          this.kill(entry);
          return;
        }
        this.ricochet(entry, timeMs, x0, y0, hitX, hitY, 4);
        sfx.metalHit();
        return;
      }
      case 'zombie': {
        const zombie = this.hitZombie;
        if (zombie !== null) zombie.damage(data.damage, data.owner === 'player' ? 'player' : 'ricochet');
        const inv = 1 / Math.hypot(data.vx, data.vy);
        this.effects.sparks(hitX, hitY, data.vx * inv, data.vy * inv);
        this.kill(entry);
        return;
      }
      case 'player': {
        runStore.damagePlayer(data.damage);
        if (this.handlers.onPlayerHit !== undefined) this.handlers.onPlayerHit(data.damage, hitX, hitY);
        sfx.playerHit();
        this.kill(entry);
        return;
      }
      case 'core': {
        // Player shots stop on the core but never damage it.
        if (data.owner === 'zombie') {
          runStore.damageCore(data.damage);
          if (this.handlers.onCoreHit !== undefined) this.handlers.onCoreHit(data.damage, hitX, hitY);
          sfx.coreHit();
        } else {
          this.effects.sparks(hitX, hitY, this.hitNX, this.hitNY);
        }
        this.kill(entry);
        return;
      }
      default: {
        this.kill(entry);
        return;
      }
    }
  }

  private ricochet(entry: BulletEntry, timeMs: number, x0: number, y0: number, hitX: number, hitY: number, sparkCount?: number): void {
    const data = entry.data;
    const result = applyRicochet({
      vx: data.vx,
      vy: data.vy,
      nx: this.hitNX,
      ny: this.hitNY,
      damage: data.damage,
      ricochetCount: data.ricochetCount,
      owner: data.owner,
      canDamageZombies: data.canDamageZombies,
    });
    const len = Math.hypot(result.reflected.vx, result.reflected.vy);
    const inv = len > EPS ? 1 / len : 0;
    const ux = result.reflected.vx * inv;
    const uy = result.reflected.vy * inv;
    const wasArmed = data.canDamageZombies;

    data.vx = ux * result.speed;
    data.vy = uy * result.speed;
    data.damage = result.damage;
    data.ricochetCount = result.ricochetCount;
    data.canDamageZombies = result.canDamageZombies;

    const img = entry.img;
    img.setRotation(Math.atan2(data.vy, data.vx));
    if (!wasArmed && result.canDamageZombies) {
      // Armed by the bounce: now readable as lethal to zombies.
      img.setTexture('bullet-player').setTint(ARMED_TINT).setScale(ARMED_SCALE);
    }

    // Nudge past the impact so the reflected path never starts embedded.
    const px = hitX + ux * NUDGE_PX;
    const py = hitY + uy * NUDGE_PX;
    img.setPosition(px, py);
    entry.prevX = px;
    entry.prevY = py;
    entry.lastHitId = this.hitId;
    entry.lastHitAt = timeMs;

    this.effects.sparks(hitX, hitY, ux, uy, sparkCount ?? RICOCHET_SPARKS);
    this.effects.tracer(x0, y0, hitX, hitY, TRACER_COLOR);
    // Outgoing stub: the bounce direction must be followable at a glance.
    const stubColor = data.canDamageZombies && data.owner === 'zombie' ? ARMED_TINT : TRACER_COLOR;
    this.effects.tracer(hitX, hitY, hitX + ux * RICOCHET_STUB, hitY + uy * RICOCHET_STUB, stubColor);
    runStore.recordRicochet();
  }
}
