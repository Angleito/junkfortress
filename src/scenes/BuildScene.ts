import Phaser from 'phaser';
import { CHAIN_MAX_HP, CHAIN_MAX_LENGTH, GAME_HEIGHT, GAME_WIDTH } from '../utils/Constants';
import { drawArena, drawBuildZone } from '../utils/Arena';
import { runStore } from '../state/runStore';
import { showPauseMenu } from '../ui/PauseMenu';
import { ITEM_DEFINITIONS } from '../data/items';
import { chainPlacementCheck, objectRect, placementCheck, type Rect } from '../systems/StructureSystem';
import type { InventoryItem, ItemType, SavedBuildObject, SavedChain } from '../types/game';

let placedIdCounter = 0;
let lootIdCounter = 0;

const SLOT_W = 74;
const SLOT_H = 68;
const BAR_Y = GAME_HEIGHT - 50;
const BAR_TOP = BAR_Y - SLOT_H / 2;
const MAX_BAR_WIDTH = 560;

type BuildMode = 'idle' | 'placing' | 'chain' | 'moving';

interface InventorySlot {
  item: InventoryItem;
  objects: Phaser.GameObjects.GameObject[];
}

export class BuildScene extends Phaser.Scene {
  private slots: InventorySlot[] = [];
  private selectedItem: InventoryItem | null = null;
  private mode: BuildMode = 'idle';
  private ghost: Phaser.GameObjects.Image | null = null;
  private ghostOutline: Phaser.GameObjects.Graphics | null = null;
  private chainGhost: Phaser.GameObjects.Graphics | null = null;
  private chainLayer: Phaser.GameObjects.Graphics | null = null;
  private ghostRotation = 0;
  private movingObject: SavedBuildObject | null = null;
  private selectedChainId: string | null = null;
  private chainFirst: { objectId: string; x: number; y: number } | null = null;
  private placedVisuals = new Map<string, Phaser.GameObjects.Image>();
  private hintText: Phaser.GameObjects.Text | null = null;
  private removeMode = false;
  private scrollOffset = 0;
  private barDragStartX = 0;
  private barDragStartOffset = 0;
  private barDragging = false;
  private menuButton: Phaser.GameObjects.Rectangle | null = null;
  private rotateButtons: Phaser.GameObjects.GameObject[] = [];
  private toolButtons: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('BuildScene');
  }

  create(): void {
    drawArena(this);
    drawBuildZone(this);

    this.add.text(GAME_WIDTH - 12, 56, `WAVE ${runStore.get().waveNumber}`, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9a948a',
    }).setOrigin(1, 0);

    this.hintText = this.add.text(12, 12, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#77726a',
    });

    this.chainLayer = this.add.graphics().setDepth(5);
    this.chainGhost = this.add.graphics().setDepth(20);
    this.ghostOutline = this.add.graphics().setDepth(21);

    this.renderMenuButton();
    this.renderInventory();
    this.renderToolButtons();
    this.renderStartWaveButton();
    this.rebuildPlacedVisuals();
    this.updateHint();

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.barDragging) {
        this.scrollOffset = Phaser.Math.Clamp(
          this.barDragStartOffset + (this.barDragStartX - pointer.x),
          0,
          this.maxScroll(),
        );
        this.renderInventory();
        return;
      }
      this.updateGhost(pointer);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y > BAR_TOP) {
        this.barDragging = true;
        this.barDragStartX = pointer.x;
        this.barDragStartOffset = this.scrollOffset;
        return;
      }
      if (pointer.rightButtonDown()) {
        this.cancelCurrent();
        return;
      }
      this.handleClick(pointer);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.barDragging && Math.abs(pointer.x - this.barDragStartX) < 12) {
        this.selectSlotAt(pointer.x);
      }
      this.barDragging = false;
    });

    this.input.keyboard?.on('keydown-Q', () => this.rotateGhost(-15));
    this.input.keyboard?.on('keydown-E', () => this.rotateGhost(15));
    this.input.keyboard?.on('keydown-DELETE', () => this.deleteSelected());
    this.input.keyboard?.on('keydown-BACKSPACE', () => this.deleteSelected());
    this.input.keyboard?.on('keydown-ESC', () => showPauseMenu(this));
  }

  private renderMenuButton(): void {
    this.menuButton?.destroy();
    const btn = this.add.rectangle(GAME_WIDTH - 36, 28, 56, 40, 0x1c1c1c, 1).setStrokeStyle(2, 0x3a3a3a);
    this.add.text(GAME_WIDTH - 36, 28, 'MENU', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#e8e0d0',
    }).setOrigin(0.5);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => showPauseMenu(this));
    this.menuButton = btn;
  }

  private renderToolButtons(): void {
    this.toolButtons.forEach((o) => o.destroy());
    this.toolButtons = [];
    const y = 108;
    const modes: ['build', 'remove'] = ['build', 'remove'];
    modes.forEach((mode) => {
      const x = GAME_WIDTH - 108 + modes.indexOf(mode) * 92;
      const active = mode === 'remove' ? this.removeMode : !this.removeMode;
      const rect = this.add.rectangle(x, y, 84, 48, active ? 0x2a3a2a : 0x1c1c1c, 1).setStrokeStyle(2, active ? 0x7fd07f : 0x3a3a3a);
      const label = this.add.text(x, y, mode === 'build' ? 'BUILD' : 'REMOVE', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: active ? '#7fd07f' : '#9a948a',
      }).setOrigin(0.5);
      this.toolButtons.push(rect, label);
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerdown', () => {
        this.removeMode = mode === 'remove';
        if (this.removeMode) this.cancelSelection();
        else this.clearSelection();
        this.renderToolButtons();
        this.updateHint();
      });
    });
  }

  private renderRotateButtons(): void {
    this.rotateButtons.forEach((o) => o.destroy());
    this.rotateButtons = [];
    if (this.mode !== 'placing' && this.mode !== 'moving') return;

    const y = GAME_HEIGHT - 118;
    const x0 = 60;
    const labels = ['⟲', '⟳'];
    labels.forEach((label, i) => {
      const x = x0 + i * 64;
      const rect = this.add.rectangle(x, y, 56, 48, 0x1c1c1c, 1).setStrokeStyle(2, 0x3a3a3a);
      const txt = this.add.text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#e8e0d0',
      }).setOrigin(0.5);
      this.rotateButtons.push(rect, txt);
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerdown', () => this.rotateGhost(i === 0 ? -15 : 15));
    });
  }

  private rotateGhost(delta: number): void {
    if (this.mode !== 'placing' && this.mode !== 'moving') return;
    this.ghostRotation = (this.ghostRotation + delta + 360) % 360;
    this.ghost?.setRotation(Phaser.Math.DegToRad(this.ghostRotation));
    const p = this.input.activePointer;
    this.drawGhostOutline(p.x, p.y, this.ghostValid(p));
  }

  private renderInventory(): void {
    this.clearInventoryUi();
    const inventory = runStore.get().inventory;
    const startX = 60;
    const contentWidth = inventory.length * (SLOT_W + 8);

    inventory.forEach((item, i) => {
      const x = startX + i * (SLOT_W + 8) - this.scrollOffset;
      const objects: Phaser.GameObjects.GameObject[] = [];

      const rect = this.add.rectangle(x, BAR_Y, SLOT_W, SLOT_H, 0x1c1c1c, 1).setStrokeStyle(2, 0x3a3a3a);
      const icon = this.add.image(x, BAR_Y - 10, item.type).setScale(0.8);
      const label = this.add.text(x, BAR_Y + 20, item.name.length > 12 ? item.name.slice(0, 10) + '..' : item.name, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#c8c2b8',
      }).setOrigin(0.5);

      objects.push(rect, icon, label);
      this.slots.push({ item, objects });
    });

    const selectedIndex = this.selectedItem ? inventory.indexOf(this.selectedItem) : -1;
    this.slots.forEach((slot, i) => {
      const rect = slot.objects[0] as Phaser.GameObjects.Rectangle;
      const active = i === selectedIndex;
      rect.setFillStyle(active ? 0x2a3a2a : 0x1c1c1c);
      rect.setStrokeStyle(2, active ? 0x7fd07f : 0x3a3a3a);
    });

    if (contentWidth > MAX_BAR_WIDTH) {
      this.add.text(12, BAR_Y, '◀ drag ▶', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#55524c',
      }).setOrigin(0, 0.5);
    }
  }

  private selectSlotAt(x: number): void {
    const slot = this.slots.find((s) => {
      const rect = s.objects[0] as Phaser.GameObjects.Rectangle;
      return Math.abs(rect.x - x) <= SLOT_W / 2;
    });
    if (!slot) return;
    if (this.selectedItem === slot.item) {
      this.cancelSelection();
      return;
    }
    this.selectItem(slot.item);
  }

  private selectItem(item: InventoryItem): void {
    if (this.mode === 'moving') this.cancelMoving();
    this.clearSelection();
    this.selectedItem = item;
    this.ghostRotation = 0;
    if (item.type === 'chain') {
      this.mode = 'chain';
      this.chainFirst = null;
      this.chainGhost?.clear();
    } else {
      this.mode = 'placing';
      this.ghost?.destroy();
      this.ghost = this.add.image(0, 0, item.type).setAlpha(0.6).setDepth(20);
      this.ghostOutline?.clear();
    }
    this.renderInventory();
    this.renderRotateButtons();
    this.updateHint();
  }

  private cancelSelection(): void {
    this.selectedItem = null;
    this.mode = 'idle';
    this.chainFirst = null;
    this.movingObject = null;
    this.ghost?.destroy();
    this.ghost = null;
    this.ghostOutline?.clear();
    this.chainGhost?.clear();
    this.renderInventory();
    this.renderRotateButtons();
    this.updateHint();
  }

  private cancelMoving(): void {
    const img = this.movingObject ? this.placedVisuals.get(this.movingObject.id) : null;
    img?.setVisible(true);
    this.cancelSelection();
  }

  private clearSelection(): void {
    this.selectedChainId = null;
    this.renderChains();
  }

  private cancelCurrent(): void {
    if (this.mode === 'moving') this.cancelMoving();
    else if (this.mode === 'placing' || this.mode === 'chain') this.cancelSelection();
    else this.clearSelection();
  }

  private deleteSelected(): void {
    if (this.removeMode) return;
    if (this.mode === 'moving' && this.movingObject) this.removeObject(this.movingObject.id);
    else if (this.selectedChainId) this.removeChain(this.selectedChainId);
  }

  private handleClick(pointer: Phaser.Input.Pointer): void {
    if (this.removeMode) {
      const hit = this.hitTest(pointer.x, pointer.y);
      if (hit?.kind === 'object') this.removeObject(hit.id);
      else if (hit?.kind === 'chain') this.removeChain(hit.id);
      return;
    }
    switch (this.mode) {
      case 'placing':
        this.tryPlace(pointer);
        break;
      case 'chain':
        this.chainClick(pointer);
        break;
      case 'moving':
        this.tryMove(pointer);
        break;
      case 'idle':
        this.trySelect(pointer);
        break;
    }
  }

  private trySelect(pointer: Phaser.Input.Pointer): void {
    const hit = this.hitTest(pointer.x, pointer.y);
    if (hit?.kind === 'object') {
      this.startMoving(hit.id);
    } else if (hit?.kind === 'chain') {
      this.selectedChainId = hit.id;
      this.renderChains();
      this.updateHint();
    } else {
      this.clearSelection();
    }
  }

  private startMoving(id: string): void {
    const obj = runStore.get().placedObjects.find((o) => o.id === id);
    if (!obj) return;
    this.clearSelection();
    this.movingObject = obj;
    this.mode = 'moving';
    this.ghostRotation = obj.rotation;
    this.ghost?.destroy();
    this.ghost = this.add.image(obj.x, obj.y, obj.type).setAlpha(0.6).setDepth(20);
    this.placedVisuals.get(id)?.setVisible(false);
    this.renderRotateButtons();
    this.updateHint();
  }

  private tryMove(pointer: Phaser.Input.Pointer): void {
    const hit = this.hitTest(pointer.x, pointer.y);
    if (hit?.kind === 'object' && hit.id !== this.movingObject?.id) {
      this.startMoving(hit.id);
      return;
    }
    if (hit?.kind === 'chain') {
      this.cancelMoving();
      this.selectedChainId = hit.id;
      this.renderChains();
      this.updateHint();
      return;
    }
    const obj = this.movingObject;
    if (!obj) return;
    const candidate: SavedBuildObject = { ...obj, x: pointer.x, y: pointer.y, rotation: this.ghostRotation };
    const result = placementCheck(
      candidate,
      runStore.get().placedObjects.filter((o) => o.id !== obj.id),
      runStore.get().chains,
    );
    if (!result.valid) return;
    obj.x = pointer.x;
    obj.y = pointer.y;
    obj.rotation = this.ghostRotation;
    const img = this.placedVisuals.get(obj.id);
    img?.setPosition(obj.x, obj.y).setRotation(Phaser.Math.DegToRad(obj.rotation)).setVisible(true);
    this.renderChains();
    this.cancelSelection();
  }

  private tryPlace(pointer: Phaser.Input.Pointer): void {
    if (!this.selectedItem || !this.ghost) return;
    const candidate: SavedBuildObject = {
      id: `placed-${++placedIdCounter}`,
      type: this.selectedItem.type,
      x: pointer.x,
      y: pointer.y,
      rotation: this.ghostRotation,
      hp: ITEM_DEFINITIONS[this.selectedItem.type].maxHp,
    };
    const result = placementCheck(candidate, runStore.get().placedObjects, runStore.get().chains);
    if (!result.valid) return;

    const img = this.add
      .image(pointer.x, pointer.y, this.selectedItem.type)
      .setRotation(Phaser.Math.DegToRad(this.ghostRotation))
      .setDepth(5);
    this.placedVisuals.set(candidate.id, img);
    runStore.setPlacedObjects([...runStore.get().placedObjects, candidate]);
    runStore.get().inventory.splice(runStore.get().inventory.indexOf(this.selectedItem), 1);
    this.cancelSelection();
  }

  private chainClick(pointer: Phaser.Input.Pointer): void {
    const hit = this.hitTest(pointer.x, pointer.y);
    if (!hit || hit.kind !== 'object') return;
    if (!this.chainFirst) {
      this.chainFirst = { objectId: hit.id, x: pointer.x, y: pointer.y };
      return;
    }
    if (this.chainFirst.objectId === hit.id) return;
    const check = chainPlacementCheck(
      this.chainFirst,
      { objectId: hit.id, x: pointer.x, y: pointer.y },
      runStore.get().placedObjects,
    );
    if (!check.valid || !this.selectedItem) return;

    const objA = runStore.get().placedObjects.find((o) => o.id === this.chainFirst!.objectId);
    const objB = runStore.get().placedObjects.find((o) => o.id === hit.id);
    if (!objA || !objB) return;

    const chain: SavedChain = {
      id: `chain-${++placedIdCounter}`,
      anchorA: { objectId: objA.id, x: this.chainFirst.x - objA.x, y: this.chainFirst.y - objA.y },
      anchorB: { objectId: objB.id, x: pointer.x - objB.x, y: pointer.y - objB.y },
      hp: CHAIN_MAX_HP,
    };
    runStore.addChain(chain);
    runStore.get().inventory.splice(runStore.get().inventory.indexOf(this.selectedItem), 1);
    this.renderChains();
    this.cancelSelection();
  }

  private removeObject(id: string): void {
    const obj = runStore.get().placedObjects.find((o) => o.id === id);
    if (!obj) return;
    const attached = runStore.get().chains.filter(
      (c) => c.anchorA.objectId === id || c.anchorB.objectId === id,
    );
    this.placedVisuals.get(id)?.destroy();
    this.placedVisuals.delete(id);
    runStore.setPlacedObjects(runStore.get().placedObjects.filter((o) => o.id !== id));
    for (const chain of attached) runStore.removeChain(chain.id);
    this.returnToInventory(obj.type);
    attached.forEach(() => this.returnToInventory('chain'));
    this.renderChains();
    this.renderInventory();
    this.clearSelection();
    this.cancelSelection();
    this.updateHint();
  }

  private removeChain(id: string): void {
    runStore.removeChain(id);
    this.returnToInventory('chain');
    this.clearSelection();
    this.renderChains();
    this.renderInventory();
    this.updateHint();
  }

  private rebuildPlacedVisuals(): void {
    for (const obj of runStore.get().placedObjects) {
      const img = this.add
        .image(obj.x, obj.y, obj.type)
        .setRotation(Phaser.Math.DegToRad(obj.rotation))
        .setDepth(5);
      this.placedVisuals.set(obj.id, img);
    }
    this.renderChains();
  }

  private renderChains(): void {
    const layer = this.chainLayer;
    if (!layer) return;
    layer.clear();
    for (const chain of runStore.get().chains) {
      const [ax, ay, bx, by] = this.chainEndpoints(chain);
      const selected = chain.id === this.selectedChainId;
      layer.lineStyle(selected ? 10 : 7, selected ? 0xf2e07a : 0x8a8a8a, selected ? 1 : 0.9);
      layer.lineBetween(ax, ay, bx, by);
    }
  }

  private chainEndpoints(chain: SavedChain): [number, number, number, number] {
    const a = runStore.get().placedObjects.find((o) => o.id === chain.anchorA.objectId);
    const b = runStore.get().placedObjects.find((o) => o.id === chain.anchorB.objectId);
    if (!a || !b) return [chain.anchorA.x, chain.anchorA.y, chain.anchorB.x, chain.anchorB.y];
    return [a.x + chain.anchorA.x, a.y + chain.anchorA.y, b.x + chain.anchorB.x, b.y + chain.anchorB.y];
  }

  private hitTest(x: number, y: number): { kind: 'object' | 'chain'; id: string } | null {
    let best: { id: string; dist: number } | null = null;
    for (const obj of runStore.get().placedObjects) {
      const rect: Rect = objectRect(obj, ITEM_DEFINITIONS[obj.type]);
      if (pointInRect(x, y, rect)) {
        const dist = Phaser.Math.Distance.Squared(obj.x, obj.y, x, y);
        if (!best || dist < best.dist) best = { id: obj.id, dist };
      }
    }
    if (best) return { kind: 'object', id: best.id };
    for (const chain of runStore.get().chains) {
      const [ax, ay, bx, by] = this.chainEndpoints(chain);
      if (distanceToSegment(x, y, ax, ay, bx, by) < 14) return { kind: 'chain', id: chain.id };
    }
    return null;
  }

  private updateGhost(pointer: Phaser.Input.Pointer): void {
    if (this.mode === 'chain') {
      this.updateChainGhost(pointer);
      return;
    }
    if (this.mode !== 'placing' && this.mode !== 'moving') return;
    if (!this.ghost) return;
    this.ghost.setPosition(pointer.x, pointer.y);
    this.drawGhostOutline(pointer.x, pointer.y, this.ghostValid(pointer));
  }

  private ghostValid(pointer: Phaser.Input.Pointer): boolean {
    const type = this.selectedItem?.type ?? this.movingObject?.type;
    if (!type) return false;
    const candidate: SavedBuildObject = {
      id: this.movingObject?.id ?? 'ghost',
      type,
      x: pointer.x,
      y: pointer.y,
      rotation: this.ghostRotation,
      hp: ITEM_DEFINITIONS[type].maxHp,
    };
    const others = this.movingObject
      ? runStore.get().placedObjects.filter((o) => o.id !== this.movingObject!.id)
      : runStore.get().placedObjects;
    return placementCheck(candidate, others, runStore.get().chains).valid;
  }

  private drawGhostOutline(x: number, y: number, valid: boolean): void {
    const outline = this.ghostOutline;
    const type = this.selectedItem?.type ?? this.movingObject?.type;
    if (!outline || !type) return;
    const def = ITEM_DEFINITIONS[type as ItemType];
    outline.clear();
    outline.save();
    outline.translateCanvas(x, y);
    outline.rotateCanvas(Phaser.Math.DegToRad(this.ghostRotation));
    outline.lineStyle(2, valid ? 0x7fd07f : 0xd06a5f, 1);
    outline.strokeRect(-def.width / 2, -def.height / 2, def.width, def.height);
    outline.restore();
  }

  private updateChainGhost(pointer: Phaser.Input.Pointer): void {
    const ghost = this.chainGhost;
    if (!ghost) return;
    ghost.clear();
    if (!this.chainFirst) return;
    const hit = this.hitTest(pointer.x, pointer.y);
    const ok =
      !!hit &&
      hit.kind === 'object' &&
      hit.id !== this.chainFirst.objectId &&
      Math.hypot(pointer.x - this.chainFirst.x, pointer.y - this.chainFirst.y) <= CHAIN_MAX_LENGTH;
    ghost.lineStyle(6, ok ? 0x7fd07f : 0xd06a5f, 0.8);
    ghost.lineBetween(this.chainFirst.x, this.chainFirst.y, pointer.x, pointer.y);
  }

  private updateHint(): void {
    if (!this.hintText) return;
    const hints: Record<BuildMode, string> = {
      idle: this.removeMode
        ? 'REMOVE MODE: click a placed object or chain to take it back.'
        : 'Tap an item, then tap the arena to place it. Right-click cancels.',
      placing: 'Left-click to place. Q/E rotate 15°. Right-click cancels.',
      chain: 'Click anchor A, then anchor B on objects. Max length 220 px.',
      moving: 'Click to move here. Q/E rotate. Delete returns to inventory. Right-click cancels.',
    };
    this.hintText.setText(hints[this.mode]);
  }

  private returnToInventory(type: string): void {
    runStore.get().inventory.push({ id: `loot-${++lootIdCounter}`, type: type as ItemType, name: type });
  }

  private clearInventoryUi(): void {
    this.slots.forEach((slot) => slot.objects.forEach((o) => o.destroy()));
    this.slots = [];
  }

  private maxScroll(): number {
    const contentWidth = runStore.get().inventory.length * (SLOT_W + 8);
    return Math.max(0, contentWidth - MAX_BAR_WIDTH);
  }

  private renderStartWaveButton(): void {
    this.add
      .text(GAME_WIDTH / 2, 60, '[ START WAVE ]', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#7fd07f',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('WaveScene'));
  }
}

function pointInRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
}

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * abx + (py - ay) * aby) / lenSq;
  t = Phaser.Math.Clamp(t, 0, 1);
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
}