# 67. Performance Requirements

Target:

```text
60 FPS
```

on a normal modern desktop/laptop browser.

Minimum acceptable:

```text
45 FPS
```

during the heaviest Wave 5 moments.

Optimize:

* Bullet pooling
* Zombie pooling if useful
* Physics collision masks
* Particle limits
* Offscreen cleanup

Avoid unnecessary physics bodies.

---

# 68. Maximum Entity Targets

Design around approximately:

```text
Active bullets: 700

Active zombies: 35

Build objects: 80

Particles: 300
```

The game should remain stable around those numbers.

---

# 69. Data Architecture

Keep configuration separate from entity behavior.

Suggested files:

```text
src/data/items.ts

src/data/weapons.ts

src/data/zombies.ts

src/data/locations.ts

src/data/waves.ts
```

Do not hardcode weapon or item statistics across classes.

---

# 70. Suggested Code Structure

```text
/src

  /scenes
    BootScene.ts
    TitleScene.ts
    ScavengeScene.ts
    LootRevealScene.ts
    BuildScene.ts
    WaveScene.ts
    WaveResultsScene.ts
    GameOverScene.ts
    VictoryScene.ts

  /entities
    Player.ts
    Zombie.ts
    Bullet.ts
    BuildObject.ts
    Core.ts

  /systems
    BulletSystem.ts
    DamageSystem.ts
    RicochetSystem.ts
    StructureSystem.ts
    CrushSystem.ts
    ExplosionSystem.ts
    LootSystem.ts
    WaveSystem.ts
    InventorySystem.ts
    StatsSystem.ts

  /data
    items.ts
    weapons.ts
    zombies.ts
    waves.ts
    locations.ts

  /ui
    HUD.ts
    InventoryBar.ts
    BuildTooltip.ts
    WavePreview.ts

  /utils
    Random.ts
    Math.ts
    Constants.ts

  /types
    game.ts

  main.ts
```

---

# 71. Global Run State

Example:

```ts
interface RunState {
  seed: number;

  waveNumber: number;

  inventory: InventoryItem[];

  placedObjects: SavedBuildObject[];

  playerHp: number;
  coreHp: number;

  stats: RunStats;
}
```

---

# 72. Run Statistics

```ts
interface RunStats {
  totalKills: number;

  playerKills: number;
  ricochetKills: number;
  crushKills: number;
  explosionKills: number;

  bulletsFiredByZombies: number;
  bulletsRicocheted: number;

  structuresLost: number;
}
```

---

# 73. Persistence

No mid-run save system is required.

Refreshing the browser may restart the run.

Persist only user settings using:

```text
localStorage
```

Persist:

* Master volume
* SFX volume
* Music volume

Everything else resets with a new run.

---

# 74. Reset Behavior

Provide:

```text
NEW RUN
```

from Victory or Game Over.

Starting a new run resets:

* Wave
* Inventory
* Structures
* Core HP
* Player HP
* Stats
* Random seed

Settings remain unchanged.