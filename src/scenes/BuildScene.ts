import Phaser from 'phaser';
import { CHAIN_MAX_HP, CHAIN_MAX_LENGTH, GAME_HEIGHT, GAME_WIDTH } from '../utils/Constants';
import { drawArena, drawBuildZone } from '../utils/Arena';
import { runStore } from '../state/runStore';
import { showPauseMenu } from '../ui/PauseMenu';
import { ITEM_DEFINITIONS } from '../data/items';
import { chainPlacementCheck, objectRect, placementCheck } from '../systems/StructureSystem';
import { sfx } from '../systems/Audio';
import { Effects } from '../systems/Effects';
import { setDebugProvider } from '../debug/DebugApi';
import type { ChainViolation, PlacementViolation } from '../systems/StructureSystem';
import type { ItemType, SavedBuildObject } from '../types/game';

/** Short, plain-language reason shown where the ghost was refused. */
const REJECTION_TEXT: Record<PlacementViolation, string> = {
 'outside-zone': 'outside the build area',
 'overlaps-core': 'too close to the core',
 'overlaps-object': 'junk is in the way',
 unsupported: 'needs support underneath',
};

const CHAIN_TEXT: Record<ChainViolation, string> = {
 'same-object': 'pick a different object',
 'too-long': `chain max ${CHAIN_MAX_LENGTH}px`,
 'missing-object': 'anchor must be on junk',
};

type BuildMode = 'idle' | 'placing' | 'moving' | 'chain';

/** Palette slots are fixed left-to-right, whatever the inventory holds. */
const PALETTE_ORDER: ItemType[] = ['plank', 'metal_sheet', 'chain', 'anvil'];

interface PendingAnchor {
 objectId: string; x: number; y: number;
}

/** Palette slot as pure data; x/y are the hit-area top-left (same convention as StructureSystem.Rect). */
interface SlotView {
 index: number; type: ItemType; count: number; x: number; y: number; w: number; h: number;
}

const SLOT_W = 74;
const SLOT_H = 68;
const SLOT_GAP = 8;
const PANEL_PAD = 8;
/**
 * The palette runs down the right edge, clear of BUILD_ZONE (x 60..700): a bar across the bottom
 * sits on the ground line, which is exactly where every ground placement has to be clicked.
 */
const SLOT_X = GAME_WIDTH - 66;
const SLOT_TOP = 170;
const HINT_Y = GAME_HEIGHT - 40;
const START_BTN = { x: GAME_WIDTH / 2, y: 30, w: 260, h: 52 };
const ROTATE_STEP_DEG = 15;
const COLOR_VALID = 0x7fd07f;
const COLOR_INVALID = 0xd06a5f;
/** Strand look; must stay identical to WaveStructureManager's CHAIN_* constants. */
const CHAIN_STYLE = {
 line: 6, inner: 2, spacing: 15, tickHalf: 4, anchorR: 3,
 dark: 0x2b2d31, light: 0x8b939c, anchor: 0x4a4f57,
};
const DEPTH = { placed: 5, chain: 6, ghost: 20, outline: 21, flash: 22, ui: 30, slot: 31 };
const HINTS: Record<BuildMode, string> = {
 idle: 'Click a junk slot, then click the arena. Right-click a placed piece to take it back.',
 placing: 'Left-click to place (needs ground or junk under it). Q/E rotate. Right-click cancels.',
 moving: 'Left-click to drop it here. Q/E rotate. DEL returns it.',
 chain: 'Click the first piece, then the second (max 220 px).',
};

/** Session counter: build ids stay unique across scene restarts and give the support graph stable keys. */
let idCounter = 0;

function mono(scene: Phaser.Scene, x: number, y: number, text: string, fontSize: string, color: string) {
 return scene.add.text(x, y, text, { fontFamily: 'monospace', fontSize, color });
}

function strokeRotatedRect(
 g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number,
 rotationDeg: number, color: number, thickness: number,
): void {
 g.lineStyle(thickness, color, 1).save();
 g.translateCanvas(x, y).rotateCanvas(Phaser.Math.DegToRad(rotationDeg));
 g.strokeRect(-w / 2, -h / 2, w, h).restore();
}

/** Must stay in step with the wave's chain rendering: the player previews exactly what they get. */
function drawChainStrand(g: Phaser.GameObjects.Graphics, ax: number, ay: number, bx: number, by: number): void {
 g.lineStyle(CHAIN_STYLE.line, CHAIN_STYLE.dark, 1).lineBetween(ax, ay, bx, by);
 g.lineStyle(CHAIN_STYLE.inner, CHAIN_STYLE.light, 1).lineBetween(ax, ay, bx, by);

 const dx = bx - ax;
 const dy = by - ay;
 const length = Math.hypot(dx, dy);
 if (length > CHAIN_STYLE.spacing) {
  const ux = dx / length;
  const uy = dy / length;
  for (let d = CHAIN_STYLE.spacing * 0.5; d < length; d += CHAIN_STYLE.spacing) {
   const px = ax + ux * d;
   const py = ay + uy * d;
   const tx = uy * CHAIN_STYLE.tickHalf;
   const ty = ux * CHAIN_STYLE.tickHalf;
   g.lineBetween(px - tx, py + ty, px + tx, py - ty);
  }
 }
 g.fillStyle(CHAIN_STYLE.anchor, 1).fillCircle(ax, ay, CHAIN_STYLE.anchorR).fillCircle(bx, by, CHAIN_STYLE.anchorR);
}

export class BuildScene extends Phaser.Scene {
 readonly sceneKey = 'BuildScene';

 private chainLayer!: Phaser.GameObjects.Graphics;
 private chainPreview!: Phaser.GameObjects.Graphics;
 private outline!: Phaser.GameObjects.Graphics;
 private denyFlash!: Phaser.GameObjects.Graphics;
 private fx!: Effects;
 private hintText!: Phaser.GameObjects.Text;
 private slots: SlotView[] = [];
 private slotUi: Phaser.GameObjects.GameObject[] = [];
 private placedVisuals = new Map<string, Phaser.GameObjects.Image>();
 private mode: BuildMode = 'idle';
 private selectedType: ItemType | null = null;
 private ghost: Phaser.GameObjects.Image | null = null;
 private ghostRotation = 0;
 /** Why the last placement attempt was refused; surfaced through the debug state for automation. */
 private lastRejection: string | null = null;
 /** Live runStore object being moved; the store keeps its original pose until the move commits. */
 private moving: SavedBuildObject | null = null;
 private chainFirst: PendingAnchor | null = null;

 constructor() {
  super('BuildScene');
 }

 create(): void {
  // create() can run again on scene restart, so every editor field is reset here.
  this.mode = 'idle'; this.selectedType = null; this.moving = null; this.chainFirst = null;
  this.ghostRotation = 0; this.ghost = null; this.slots = []; this.slotUi = []; this.placedVisuals.clear();

  drawArena(this);
  drawBuildZone(this);
  this.chainLayer = this.add.graphics().setDepth(DEPTH.chain);
  this.chainPreview = this.add.graphics().setDepth(DEPTH.ghost);
  this.outline = this.add.graphics().setDepth(DEPTH.outline);
  this.denyFlash = this.add.graphics().setDepth(DEPTH.flash);
  this.fx = new Effects(this);
  this.buildChrome();
  for (const obj of runStore.get().placedObjects) this.spawnVisual(obj);
  this.renderInventory();
  this.drawChains();
  this.hintText.setText(HINTS[this.mode]);

  this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer.x, pointer.y));
  this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) =>
   this.onPointerDown(pointer, over.length > 0),
  );
  const keys = this.input.keyboard;
  keys?.on('keydown', () => sfx.unlock());
  keys?.on('keydown-Q', () => this.rotateGhost(-ROTATE_STEP_DEG));
  keys?.on('keydown-E', () => this.rotateGhost(ROTATE_STEP_DEG));
  keys?.on('keydown-DELETE', () => this.returnMovingToInventory());
  keys?.on('keydown-BACKSPACE', () => this.returnMovingToInventory());
  keys?.on('keydown-ENTER', () => this.startWave());
  keys?.on('keydown-ESC', () => showPauseMenu(this));

  setDebugProvider(this);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => setDebugProvider(null));
 }

 private buildChrome(): void {
  // The panel claims clicks inside the palette column, so a stray click there never reaches the arena.
  const panelHeight = PALETTE_ORDER.length * SLOT_H + (PALETTE_ORDER.length - 1) * SLOT_GAP + PANEL_PAD * 2;
  const panelTop = SLOT_TOP - PANEL_PAD;
  this.add
   .rectangle(SLOT_X, panelTop + panelHeight / 2, SLOT_W + PANEL_PAD * 2, panelHeight, 0x101010, 0.94)
   .setDepth(DEPTH.ui)
   .setInteractive();
  this.hintText = mono(this, 16, HINT_Y, '', '13px', '#77726a').setDepth(DEPTH.ui);

  const start = this.add.rectangle(START_BTN.x, START_BTN.y, START_BTN.w, START_BTN.h, 0x1e2a1e, 1);
  start.setStrokeStyle(3, COLOR_VALID).setDepth(DEPTH.ui).setInteractive({ useHandCursor: true });
  start.on('pointerdown', () => this.startWave());
  mono(this, START_BTN.x, START_BTN.y, '[ START WAVE ]', '24px', '#7fd07f').setOrigin(0.5).setDepth(DEPTH.slot);

  const menu = mono(this, GAME_WIDTH - 60, 28, '[ MENU ]', '16px', '#e8e0d0');
  menu.setOrigin(0.5).setPadding(12, 8).setDepth(DEPTH.ui).setInteractive({ useHandCursor: true });
  menu.on('pointerdown', () => showPauseMenu(this));
 }

 private onPointerMove(x: number, y: number): void {
  if (this.mode === 'chain') {
   this.updateChainPreview(x, y);
   return;
  }
  this.updateGhostAt(x, y);
 }

 private onPointerDown(pointer: Phaser.Input.Pointer, overUi: boolean): void {
  sfx.unlock();
  if (overUi) return;
  const x = pointer.x;
  const y = pointer.y;
  if (pointer.rightButtonDown()) {
   this.handleRightClick(x, y);
   return;
  }
  if (this.mode === 'placing') this.tryPlace(x, y);
  else if (this.mode === 'moving') this.tryCommitMove(x, y);
  else if (this.mode === 'chain') this.chainClick(x, y);
  else {
   const hit = this.hitTestObject(x, y);
   if (hit) this.startMoving(hit, x, y);
  }
 }

 private handleRightClick(x: number, y: number): void {
  if (this.mode !== 'idle') {
   this.cancelToIdle(); // puts a moving piece back at its store pose, or drops a selection
   return;
  }
  const hit = this.hitTestObject(x, y);
  if (hit) this.returnObjectToInventory(hit.id);
 }

 private selectType(type: ItemType): void {
  if (this.mode === 'moving') this.cancelToIdle();
  if (this.selectedType === type) {
   this.cancelToIdle();
   return;
  }
  this.selectedType = type;
  this.chainFirst = null;
  this.ghostRotation = 0;
  this.ghost?.destroy();
  this.ghost = null;
  this.chainPreview.clear();
  this.outline.clear();

  if (type === 'chain') {
   this.mode = 'chain';
  } else {
   this.mode = 'placing';
   this.ghost = this.add.image(0, 0, type).setAlpha(0.55).setDepth(DEPTH.ghost);
   const pointer = this.input.activePointer;
   this.updateGhostAt(pointer.x, pointer.y);
  }
  this.renderInventory();
  this.updateHint();
 }

 private rotateGhost(delta: number): void {
  if (this.mode !== 'placing' && this.mode !== 'moving') return;
  this.ghostRotation = (this.ghostRotation + delta + 360) % 360;
  const pointer = this.input.activePointer;
  this.updateGhostAt(pointer.x, pointer.y);
 }

 private tryPlace(x: number, y: number): void {
  const type = this.selectedType;
  if (!type) return;
  const def = ITEM_DEFINITIONS[type];
  const candidate: SavedBuildObject = {
   id: `build-obj-${++idCounter}`, type, x, y, rotation: this.ghostRotation, hp: def.maxHp,
  };
  const result = placementCheck(candidate, runStore.get().placedObjects, runStore.get().chains);
  if (!result.valid) {
   this.lastRejection = result.violations.join(',');
   this.deny((g) => strokeRotatedRect(g, x, y, def.width, def.height, this.ghostRotation, COLOR_INVALID, 3), REJECTION_TEXT[result.violations[0] ?? 'unsupported'], x, y);
   return;
  }
  this.lastRejection = null;
  runStore.setPlacedObjects([...runStore.get().placedObjects, candidate]);
  this.spawnVisual(candidate);
  sfx.place();
  this.consumeSelected();
  this.renderInventory();
  this.updateHint();
 }

 private startMoving(obj: SavedBuildObject, x: number, y: number): void {
  this.moving = obj;
  this.chainFirst = null;
  this.ghostRotation = obj.rotation;
  this.mode = 'moving';
  this.ghost?.destroy();
  this.ghost = this.add.image(x, y, obj.type).setAlpha(0.55).setDepth(DEPTH.ghost);
  this.placedVisuals.get(obj.id)?.setVisible(false);
  this.updateGhostAt(x, y);
  this.updateHint();
 }

 private tryCommitMove(x: number, y: number): void {
  const obj = this.moving;
  if (!obj) {
   this.cancelToIdle();
   return;
  }
  const other = this.hitTestObject(x, y);
  if (other && other.id !== obj.id) {
   this.cancelToIdle();
   this.startMoving(other, x, y);
   return;
  }
  const candidate: SavedBuildObject = { ...obj, x, y, rotation: this.ghostRotation };
  const moveResult = placementCheck(candidate, runStore.get().placedObjects, runStore.get().chains);
  if (!moveResult.valid) {
   const def = ITEM_DEFINITIONS[obj.type];
   this.deny((g) => strokeRotatedRect(g, x, y, def.width, def.height, this.ghostRotation, COLOR_INVALID, 3), REJECTION_TEXT[moveResult.violations[0] ?? 'unsupported'], x, y);
   return;
  }
  obj.x = x;
  obj.y = y;
  obj.rotation = this.ghostRotation;
  sfx.place();
  this.cancelToIdle(); // re-projects the visual from the store, so the move shows up in place
 }

 private returnMovingToInventory(): void {
  if (this.mode === 'moving' && this.moving) this.returnObjectToInventory(this.moving.id);
 }

 private returnObjectToInventory(id: string): void {
  const run = runStore.get();
  const obj = run.placedObjects.find((o) => o.id === id);
  if (!obj) return;
  const attached = run.chains.filter((c) => c.anchorA.objectId === id || c.anchorB.objectId === id);
  runStore.setPlacedObjects(run.placedObjects.filter((o) => o.id !== id));
  this.placedVisuals.get(id)?.destroy();
  this.placedVisuals.delete(id);
  for (const chain of attached) {
   runStore.removeChain(chain.id);
   runStore.addInventoryItem('chain');
  }
  runStore.addInventoryItem(obj.type);
  sfx.place();
  this.cancelToIdle();
 }

 private chainClick(x: number, y: number): void {
  const hit = this.hitTestObject(x, y);
  if (!hit) {
   this.deny((g) => g.lineStyle(3, COLOR_INVALID, 1).strokeCircle(x, y, 12));
   return;
  }
  const first = this.chainFirst;
  if (!first) {
   this.chainFirst = { objectId: hit.id, x, y };
   this.updateChainPreview(x, y);
   return;
  }
  const chainCheck = chainPlacementCheck(first, { objectId: hit.id, x, y }, runStore.get().placedObjects);
  if (!chainCheck.valid) {
   this.deny((g) => g.lineStyle(4, COLOR_INVALID, 1).lineBetween(first.x, first.y, x, y), CHAIN_TEXT[chainCheck.violation ?? 'too-long'], x, y);
   return; // anchor A stays pending so the player can retry the second end
  }
  const objA = runStore.get().placedObjects.find((o) => o.id === first.objectId);
  if (!objA) {
   this.chainFirst = null;
   return;
  }
  const anchorA = { objectId: first.objectId, x: first.x - objA.x, y: first.y - objA.y };
  const anchorB = { objectId: hit.id, x: x - hit.x, y: y - hit.y };
  runStore.addChain({ id: `build-chain-${++idCounter}`, anchorA, anchorB, hp: CHAIN_MAX_HP });
  this.chainFirst = null;
  this.chainPreview.clear();
  sfx.place();
  this.consumeSelected();
  this.renderInventory();
  this.drawChains();
  this.updateHint();
 }

 private updateChainPreview(x: number, y: number): void {
  const preview = this.chainPreview;
  preview.clear();
  const first = this.chainFirst;
  if (!first) return;
  const hit = this.hitTestObject(x, y);
  const valid = !!hit && chainPlacementCheck(first, { objectId: hit.id, x, y }, runStore.get().placedObjects).valid;
  const color = valid ? COLOR_VALID : COLOR_INVALID;
  preview.lineStyle(5, color, 0.9).lineBetween(first.x, first.y, x, y);
  preview.fillStyle(color, 1).fillCircle(first.x, first.y, 5).fillCircle(x, y, 4);
 }

 private consumeSelected(): void {
  const type = this.selectedType;
  if (!type) return;
  const item = runStore.get().inventory.find((i) => i.type === type);
  if (item) runStore.removeInventoryItem(item.id);
  if (!runStore.get().inventory.some((i) => i.type === type)) this.cancelToIdle();
 }

 private cancelToIdle(): void {
  this.mode = 'idle';
  this.selectedType = null;
  this.chainFirst = null;
  this.moving = null;
  this.ghost?.destroy();
  this.ghost = null;
  this.outline.clear();
  this.chainPreview.clear();
  // Single place where the view mirrors the model: placed images always match their store object.
  for (const obj of runStore.get().placedObjects) {
   const image = this.placedVisuals.get(obj.id);
   image?.setPosition(obj.x, obj.y).setRotation(Phaser.Math.DegToRad(obj.rotation)).setVisible(true);
  }
  this.renderInventory();
  this.drawChains();
  this.updateHint();
 }

 private updateGhostAt(x: number, y: number): void {
  if (this.mode !== 'placing' && this.mode !== 'moving') return;
  const moving = this.moving;
  const type = moving ? moving.type : this.selectedType;
  if (!this.ghost || !type) return;
  this.ghost.setPosition(x, y).setRotation(Phaser.Math.DegToRad(this.ghostRotation));
  const def = ITEM_DEFINITIONS[type];
  const candidate: SavedBuildObject = {
   id: moving?.id ?? 'ghost', type, x, y, rotation: this.ghostRotation, hp: def.maxHp,
  };
  const valid = placementCheck(candidate, runStore.get().placedObjects, runStore.get().chains).valid;
  const color = valid ? COLOR_VALID : COLOR_INVALID;
  this.outline.clear();
  strokeRotatedRect(this.outline, x, y, def.width, def.height, this.ghostRotation, color, 2);
 }

 private deny(draw: (g: Phaser.GameObjects.Graphics) => void, hintText?: string, x?: number, y?: number): void {
  sfx.deny();
  if (hintText !== undefined && x !== undefined && y !== undefined) {
   this.fx.floatText(x, y - 30, hintText, '#ff8a7a');
  }
  const flash = this.denyFlash;
  draw(flash.clear().setAlpha(1));
  this.tweens.killTweensOf(flash);
  this.tweens.add({ targets: flash, alpha: 0, duration: 220, onComplete: () => flash.clear() });
 }

 private renderInventory(): void {
  for (const object of this.slotUi) object.destroy();
  this.slotUi = [];
  this.slots = [];

  const counts: Record<ItemType, number> = { plank: 0, metal_sheet: 0, chain: 0, anvil: 0 };
  for (const item of runStore.get().inventory) counts[item.type] += 1;

  // Fixed order: slots must never reshuffle under the pointer as junk is spent.
  PALETTE_ORDER.forEach((type, index) => {
   const cy = SLOT_TOP + index * (SLOT_H + SLOT_GAP) + SLOT_H / 2;
   const def = ITEM_DEFINITIONS[type];
   const count = counts[type];
   const spent = count === 0;
   const active = type === this.selectedType;
   const rect = this.add.rectangle(SLOT_X, cy, SLOT_W, SLOT_H, active ? 0x2a3a2a : 0x1c1c1c, 1);
   rect.setStrokeStyle(2, active ? COLOR_VALID : 0x3a3a3a).setDepth(DEPTH.slot);
   if (!spent) rect.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.selectType(type));

   const icon = this.add.image(SLOT_X, cy - 12, type);
   icon.setScale(Math.min(1, 60 / def.width, 26 / def.height)).setDepth(DEPTH.slot);
   icon.setAlpha(spent ? 0.25 : 1);
   const label = mono(this, SLOT_X, cy + 20, def.name, '9px', spent ? '#5a564f' : '#c8c2b8').setOrigin(0.5).setDepth(DEPTH.slot);
   const badge = mono(this, SLOT_X + SLOT_W / 2 - 5, cy - SLOT_H / 2 + 3, String(count), '11px', spent ? '#5a564f' : '#e8e0d0');
   badge.setOrigin(1, 0).setDepth(DEPTH.slot);

   this.slotUi.push(rect, icon, label, badge);
   this.slots.push({ index, type, count, x: SLOT_X - SLOT_W / 2, y: cy - SLOT_H / 2, w: SLOT_W, h: SLOT_H });
  });
 }

 private spawnVisual(obj: SavedBuildObject): void {
  const image = this.add.image(obj.x, obj.y, obj.type);
  image.setRotation(Phaser.Math.DegToRad(obj.rotation)).setDepth(DEPTH.placed);
  this.placedVisuals.set(obj.id, image);
 }

 private drawChains(): void {
  const layer = this.chainLayer;
  layer.clear();
  for (const chain of runStore.get().chains) {
   const a = runStore.get().placedObjects.find((o) => o.id === chain.anchorA.objectId);
   const b = runStore.get().placedObjects.find((o) => o.id === chain.anchorB.objectId);
   if (!a || !b) continue;
   drawChainStrand(layer, a.x + chain.anchorA.x, a.y + chain.anchorA.y, b.x + chain.anchorB.x, b.y + chain.anchorB.y);
  }
 }

 private hitTestObject(x: number, y: number): SavedBuildObject | null {
  let best: SavedBuildObject | null = null;
  let bestDist = Infinity;
  for (const obj of runStore.get().placedObjects) {
   const rect = objectRect(obj, ITEM_DEFINITIONS[obj.type]);
   if (x < rect.x || x > rect.x + rect.width || y < rect.y || y > rect.y + rect.height) continue;
   const dist = (obj.x - x) ** 2 + (obj.y - y) ** 2;
   if (dist < bestDist) {
    bestDist = dist;
    best = obj;
   }
  }
  return best;
 }

 private updateHint(): void {
  this.hintText.setText(HINTS[this.mode]);
 }

 private startWave(): void {
  sfx.unlock();
  runStore.setPhase('wave');
  // Explicit empty payload: Phaser keeps the previous scene data, which would silently re-run a
  // debug scenario after a rebuild.
  this.scene.start('WaveScene', {});
 }

 state(): Record<string, unknown> {
  const run = runStore.get();
  return {
   scene: 'build', phase: run.phase, seed: run.seed,
   inventoryCount: run.inventory.length, placedCount: run.placedObjects.length, chainCount: run.chains.length,
   mode: this.mode,
   selected: this.selectedType,
   ghostRotation: this.ghostRotation,
   lastRejection: this.lastRejection,
   placed: run.placedObjects.map((o) => ({ id: o.id, type: o.type, x: o.x, y: o.y, rotation: o.rotation, hp: o.hp })),
   chains: run.chains.map((c) => ({ id: c.id, a: c.anchorA.objectId, b: c.anchorB.objectId, hp: c.hp })),
   slots: this.slots.map((s) => ({ index: s.index, type: s.type, count: s.count, x: s.x, y: s.y, w: s.w, h: s.h })),
   startButton: {
    x: START_BTN.x - START_BTN.w / 2, y: START_BTN.y - START_BTN.h / 2, w: START_BTN.w, h: START_BTN.h,
   },
  };
 }
}
