# Armed Zombie Junk-Fortress — MVP Build Spec

## 1. Product Summary

### Working concept

A 2D side-view browser survival game where hordes of armed zombies mindlessly advance toward the player's base while continuously firing guns.

The player does not purchase increasingly powerful defensive walls.

Instead, before every wave, the player chooses a location to scavenge and receives a random assortment of physical objects such as:

* Wooden planks
* Metal sheets
* Chains
* Anvils
* Tires
* Propane tanks
* Refrigerators
* Mattresses

The player must arrange those objects into improvised defenses.

Objects behave according to their physical properties.

Examples:

* Wood absorbs bullets but breaks relatively easily.
* Metal always ricochets bullets.
* Heavy objects can fall and crush zombies.
* Chains can suspend heavy objects.
* Mattresses absorb bullets efficiently but are fragile.
* Propane tanks explode after taking enough damage.
* Tires absorb some damage and can roll when unsupported.
* Refrigerators are heavy metal objects that can function as both armor and falling traps.

The central gameplay fantasy is:

> The zombies bring the ammunition. The player builds the machine that turns their own fire against them.

---

# 2. MVP Goal

The MVP must answer one question:

> Is it fun to receive random junk, construct an improvised fortress, and watch a huge storm of zombie bullets interact with it?

The MVP is successful if players naturally discover strategies involving:

* Bullet absorption
* Ricochets
* Angled defenses
* Structural collapse
* Falling objects
* Zombie friendly fire
* Explosions
* Combining multiple scavenged objects

Visual polish is secondary.

Physics interactions and player experimentation are the priority.

---

# 3. MVP Platform

## Primary platform

Desktop web browser.

Supported initially:

* Chrome
* Edge
* Safari
* Firefox

Desktop keyboard and mouse only.

Mobile controls are explicitly out of scope for the MVP.

---

# 4. Recommended Technology Stack

Use:

* TypeScript
* Vite
* Phaser 3
* Phaser Matter Physics
* HTML5/WebGL canvas
* Vitest for unit tests

Do not use React unless there is a strong engineering reason.

The game itself should run entirely inside Phaser.

Basic page-level UI may use HTML/CSS if that makes menus easier.

Pin exact package versions when the project is initialized.

---

# 5. Game View

The game uses a 2D side-view perspective.

Logical game resolution:

```text
1280 x 720
```

The canvas should scale proportionally to fit the browser window.

Maintain the original aspect ratio.

Do not stretch the game.

---

# 6. Arena Layout

Basic layout:

```text
----------------------------------------------------------
|                                                        |
|                      BUILD AREA                        |
|                                                        |
|            defenses                    zombies         |
|                                                        |
|         [CORE]                                         |
|          PLAYER                        <- <- <-         |
|                                                        |
==========================================================
                         GROUND
```

Suggested logical coordinates:

```text
Canvas width: 1280
Canvas height: 720

Ground Y: 660

Core X: 150
Core Y: 610

Player spawn X: 230
Player spawn Y: 620

Zombie spawn X: 1220

Build zone:
X = 80 to 700
Y = 80 to 660
```

Zombies always approach from the right side.

The player defends the left side.

---

# 7. Complete MVP Game Loop

The complete run consists of five waves.

Flow:

```text
TITLE
  ↓
SCAVENGE
  ↓
LOOT REVEAL
  ↓
BUILD
  ↓
WAVE
  ↓
WAVE RESULTS
  ↓
SCAVENGE
  ↓
BUILD
  ↓
NEXT WAVE
```

After Wave 5:

```text
VICTORY
```

If the player dies or the Core is destroyed:

```text
GAME OVER
```

The player may immediately start a new run.

---

# 8. Required Game States

Implement the following states/scenes.

## BootScene

Responsibilities:

* Load assets
* Initialize game data
* Initialize physics
* Read basic settings

Transition to TitleScene.

---

## TitleScene

Display:

```text
ARMED ZOMBIE JUNK FORTRESS

[ START RUN ]

[ HOW TO PLAY ]
```

Optional:

```text
[ RESET SETTINGS ]
```

Starting a run resets all run-specific state.

---

## ScavengeScene

Before each wave, display the incoming wave composition.

Example:

```text
INCOMING WAVE 3

10 Pistol Zombies
6 Rifle Zombies
4 Shotgun Zombies
```

Then show three scavenging choices:

```text
HARDWARE STORE

Wood        ★★★★★
Metal       ★★★
Heavy Junk  ★★
Explosives  ★


RESTAURANT

Wood        ★★★
Metal       ★★★
Heavy Junk  ★★★
Explosives  ★★★★★


JUNKYARD

Wood        ★
Metal       ★★★★★
Heavy Junk  ★★★★★
Explosives  ★★★
```

The player selects exactly one location.

The game generates six items.

Then transition to LootRevealScene.

---

## LootRevealScene

Display all scavenged items.

Example:

```text
YOU FOUND

Wooden Plank
Wooden Plank
Metal Sheet
Chain
Mattress
Anvil

[ BUILD DEFENSES ]
```

All generated items are added to the player's persistent inventory.

---

## BuildScene

The player:

* Places inventory objects
* Rotates objects
* Creates chains
* Moves previously placed objects
* Removes objects back into inventory
* Reviews the upcoming wave

No zombies are active.

No damage occurs.

When ready:

```text
[ START WAVE ]
```

---

## WaveScene

All construction editing is disabled.

The player can:

* Move
* Aim
* Shoot

Zombies:

* Spawn
* Walk toward the Core
* Shoot continuously
* Interact physically with structures

The wave ends when:

* Every zombie assigned to that wave has spawned
* Every zombie in the wave is dead

---

## WaveResultsScene

Display:

```text
WAVE COMPLETE

Zombies killed: 28
Player kills: 8
Ricochet kills: 11
Crush kills: 4
Explosion kills: 5

Core HP: 1040 / 1500

[ SCAVENGE FOR NEXT WAVE ]
```

For Wave 5, transition to VictoryScene instead.

---

## GameOverScene

Display:

```text
GAME OVER

Reached Wave: 4

Total zombies killed: 63
Ricochet kills: 19
Crush kills: 7

[ NEW RUN ]
```

---

## VictoryScene

Display:

```text
YOU SURVIVED

All 5 waves cleared.

Total zombies killed:
Ricochet kills:
Crush kills:
Explosion kills:

[ NEW RUN ]
```

---

# 9. Player

## Player stats

```text
Max HP: 100
Movement speed: 220 px/sec
```

The player moves only horizontally.

Controls:

```text
A / Left Arrow     Move left
D / Right Arrow    Move right

Mouse              Aim
Left Mouse          Shoot
```

No jumping.

No crouching.

No melee.

Player movement is limited to:

```text
X = 60 to 720
```

The player cannot walk through solid structures.

---

# 10. Player Weapon

The MVP player has one permanent weapon.

## Survivor Pistol

```text
Damage: 25
Fire rate: 4 shots/sec
Bullet speed: 1100 px/sec
Accuracy spread: 2 degrees
Ammo: Infinite
```

Player bullets interact with physical objects.

Player bullets can ricochet from metal.

Player bullets damage zombies.

Player bullets do not damage the player.

Player bullets can damage player-built objects.

This allows accidental destruction of the player's own defenses.

---

# 11. Player Death

Zombie bullets can damage the player.

Player max HP:

```text
100
```

Player HP fully restores after completing each wave.

If Player HP reaches:

```text
0
```

the run immediately ends.

---

# 12. The Core

The Core represents the player's base objective.

Stats:

```text
Max HP: 1500
```

The Core:

* Cannot move
* Cannot be repositioned
* Cannot ricochet bullets
* Blocks bullets
* Takes full projectile damage
* Cannot be destroyed by player bullets

If Core HP reaches zero:

```text
GAME OVER
```

After completing a wave:

```text
Core heals 300 HP
```

Core HP cannot exceed 1500.

---

# 13. Build Inventory

Inventory persists for the entire run.

Items that are not placed remain available next wave.

Placed objects that survive remain placed after the wave.

During the next Build phase, surviving objects may be:

* Moved
* Rotated
* Removed back into inventory

Destroyed objects are permanently lost.

Objects do not automatically repair.

---

# 14. Build Controls

During Build mode:

```text
Left Click inventory item
Select item

Mouse
Position ghost object

Q
Rotate -15 degrees

E
Rotate +15 degrees

Left Click
Place item

Right Click
Cancel placement

Left Click placed object
Select object

Delete / Backspace
Return selected object to inventory
```

A visible transparent ghost must show intended placement.

Valid placement:

```text
Green outline
```

Invalid placement:

```text
Red outline
```

---

# 15. Build Placement Rules

Objects cannot:

* Overlap the Core
* Overlap the player spawn zone
* Be placed outside the build zone
* Begin inside another solid object

Standard structural objects must be connected to:

* Ground
* Core foundation
* Another supported structure

Heavy objects may hang from chains.

---

# 16. Structural Support System

The MVP requires a simplified support graph.

Each placed object is a node.

Objects touching one another create support connections.

The following count as permanent support roots:

```text
Ground
Core foundation
```

An object is supported if a path exists from that object to a support root.

Example:

```text
GROUND
   |
WOOD
   |
WOOD
   |
METAL
```

All are supported.

If the bottom piece is destroyed:

```text
GROUND

WOOD
 |
WOOD
 |
METAL
```

The remaining objects lose support.

Unsupported objects become dynamic Matter physics bodies.

Gravity then affects them.

---

# 17. Physics Behavior During Build Phase

While building:

Placed structural objects should remain stationary.

Physics simulation may be paused or bodies temporarily static.

The player must be able to create structures without them collapsing while being edited.

---

# 18. Physics Behavior During Wave Phase

When the wave begins:

Supported structures remain static.

Unsupported structures become dynamic.

When structural objects are destroyed:

1. Remove the object.
2. Recalculate support for connected objects.
3. Any newly unsupported object becomes dynamic.
4. Gravity acts on it.

This creates collapses.

---

# 19. Gravity

Use normal downward gravity.

Suggested Matter gravity:

```text
Y gravity scale: 1
```

Tune actual acceleration until falling objects feel visually readable rather than excessively fast.

---

# 20. Chains

Chains are required for the MVP because they enable the signature anvil trap.

Chains are simplified constraints rather than fully simulated multi-link chains.

## Chain properties

```text
HP: 80
Material: metal
Bullet response: ricochet
```

Chain rendering:

A visible line between two anchor points.

Chain placement requires two clicks:

```text
Click anchor point A
Click anchor point B
```

Valid endpoints:

* Structural object
* Heavy object
* Metal object
* Wood object

Maximum chain length:

```text
220 px
```

A chain creates a Matter constraint.

If the chain reaches zero HP:

* Destroy constraint
* Any formerly hanging object becomes unsupported
* Object falls

---

# 21. Bullet System

Every gunshot creates a physical projectile.

Do not implement hitscan weapons.

Each bullet stores:

```ts
interface BulletData {
  owner: "player" | "zombie";
  sourceWeapon: WeaponType;

  damage: number;
  speed: number;

  ricochetCount: number;
  maxRicochets: number;

  canDamageZombies: boolean;
}
```

Bullets should use object pooling.

Avoid creating/destroying large numbers of JS objects every frame.

---

# 22. Bullet Cleanup

Destroy/deactivate bullets when:

* Bullet leaves the screen by 100 px
* Bullet speed becomes negligible
* Bullet reaches maximum ricochets and collides again
* Bullet hits an absorbing material
* Bullet lifetime exceeds 5 seconds

Target maximum active bullets:

```text
700
```

The game should remain stable at that count.

---

# 23. Bullet Collision Categories

At minimum:

```text
PLAYER
ZOMBIE
PLAYER_BULLET
ZOMBIE_BULLET
BUILD_OBJECT
CORE
GROUND
```

Use collision masks to avoid unnecessary collision checks.

---

# 24. Material System

Every item has one primary material.

MVP materials:

```ts
type Material =
  | "wood"
  | "metal"
  | "soft"
  | "core";
```

---

# 25. Wood Bullet Behavior

When any bullet hits wood:

1. Wood takes projectile damage.
2. Bullet is destroyed.

Wood damage multiplier:

```text
1.0
```

Example:

```text
20 damage bullet
=
20 wood HP removed
```

---

# 26. Metal Bullet Behavior

All metal always ricochets bullets.

This is a hard game rule.

When any bullet hits metal:

1. Calculate reflected bullet velocity.
2. Metal takes reduced impact damage.
3. Bullet remains active.
4. Bullet loses speed.
5. Bullet loses damage.
6. Ricochet count increases.

Metal damage multiplier:

```text
0.25
```

Example:

```text
20 damage bullet
=
5 metal HP removed
```

---

# 27. Ricochet Formula

Use reflection based on collision normal.

Conceptually:

```ts
reflected =
  velocity -
  2 * dot(velocity, normal) * normal;
```

After reflection:

```text
Bullet speed *= 0.80

Bullet damage *= 0.85

Ricochet count += 1
```

Maximum ricochets:

```text
3
```

Add a small positional offset after ricochet so the bullet does not immediately collide with the same object.

Suggested offset:

```text
8-12 px
```

---

# 28. Zombie-Friendly Fire

Normal zombie bullets do NOT damage zombies.

Before first ricochet:

```text
canDamageZombies = false
```

Immediately after a zombie bullet ricochets from metal:

```text
canDamageZombies = true
```

From that point onward, the bullet can damage:

* Zombies
* Player
* Core
* Structures

This includes the zombie that originally fired it.

---

# 29. Soft Material Behavior

Soft objects include:

* Mattress
* Tire

When bullets hit soft objects:

1. Bullet is destroyed.
2. Object takes reduced damage.

Soft material damage multiplier:

```text
0.35
```

Example:

```text
20 damage bullet
=
7 object HP removed
```

Soft materials never ricochet.

---

# 30. Heavy Falling Object Damage

Dynamic objects can damage zombies through crushing.

Only apply crush damage when:

```text
Object vertical velocity > 200 px/sec
```

and:

```text
Object is above the zombie at collision
```

Use:

```ts
impactDamage =
  massKg *
  max(0, downwardVelocity - 150) *
  0.05;
```

Clamp result:

```text
0 to 2500 damage
```

Do not apply repeated damage every physics frame.

Each object/zombie collision pair gets a:

```text
250 ms impact cooldown
```

---

# 31. Required MVP Items

Implement exactly these eight scavengable objects first.

---

## 31.1 Wooden Plank

Purpose:

Basic construction.

Stats:

```text
Material: Wood

HP: 250

Mass: 8 kg

Size:
160 x 22 px
```

Behavior:

* Absorbs bullets
* Common
* Useful as supports
* Can hold hanging objects
* Breaks relatively easily

---

## 31.2 Metal Sheet

Purpose:

Bullet reflection.

Stats:

```text
Material: Metal

HP: 500

Mass: 25 kg

Size:
150 x 18 px
```

Behavior:

* Ricochets bullets
* Stronger than wood
* Heavier than wood
* Excellent when angled

---

## 31.3 Chain

Stats:

```text
Material: Metal

HP: 80

Maximum length: 220 px
```

Behavior:

* Ricochets bullets if directly hit
* Holds hanging objects
* Breaks after enough damage

---

## 31.4 Anvil

Signature item.

Stats:

```text
Material: Metal

HP: 1400

Mass: 100 kg

Size:
70 x 45 px
```

Behavior:

* Ricochets bullets
* Extremely heavy
* Excellent falling weapon
* Can be suspended from chain
* Can kill the boss with sufficient falling velocity

Once the anvil lands, it remains a physical metal object.

Bullets hitting the fallen anvil must continue ricocheting.

---

## 31.5 Tire

Stats:

```text
Material: Soft

HP: 400

Mass: 15 kg

Diameter:
64 px
```

Behavior:

* Absorbs bullets
* Round dynamic object when unsupported
* Can roll
* Takes reduced bullet damage

---

## 31.6 Propane Tank

Stats:

```text
Material: Metal

HP: 180

Mass: 22 kg

Size:
42 x 90 px
```

Behavior:

* Ricochets bullets
* Takes reduced metal damage
* Explodes when HP reaches zero

Explosion:

```text
Radius: 130 px

Zombie damage: 250

Player damage: 100

Structure damage: 100

Core damage: 100
```

Explosion also applies physics impulse to nearby dynamic objects.

---

## 31.7 Refrigerator

Stats:

```text
Material: Metal

HP: 900

Mass: 45 kg

Size:
80 x 130 px
```

Behavior:

* Ricochets bullets
* Heavy
* Strong defensive object
* Can become a falling trap

---

## 31.8 Mattress

Stats:

```text
Material: Soft

HP: 500

Mass: 12 kg

Size:
150 x 55 px
```

Behavior:

* Absorbs bullets
* Takes only 35% bullet damage
* Does not ricochet
* Useful against rapid-fire enemies
* Relatively light

---

# 32. Item Data Architecture

Item statistics must live in data files rather than entity code.

Example:

```ts
interface ItemDefinition {
  id: string;
  name: string;

  material: Material;

  maxHp: number;
  massKg: number;

  width: number;
  height: number;

  shape: "rectangle" | "circle" | "chain";

  explosive?: boolean;
  explosionRadius?: number;

  canSupport?: boolean;
  dynamicWhenUnsupported?: boolean;
}
```

Suggested file:

```text
src/data/items.ts
```

---

# 33. Scavenging System

Each scavenging trip gives:

```text
6 items
```

Slot 1 is guaranteed to be a basic structural object.

Slot 1:

```text
70% Wooden Plank
30% Metal Sheet
```

Slots 2-6 use the selected location's weighted loot table.

Duplicates are allowed.

---

# 34. Hardware Store Loot Table

For slots 2-6:

```text
Wooden Plank      35
Metal Sheet       20
Chain             15
Tire               5
Propane Tank       5
Refrigerator       5
Mattress           10
Anvil               5
```

Total weight:

```text
100
```

---

# 35. Restaurant Loot Table

```text
Wooden Plank      15
Metal Sheet       10
Chain              5
Tire               5
Propane Tank      25
Refrigerator      25
Mattress          10
Anvil               5
```

Total:

```text
100
```

---

# 36. Junkyard Loot Table

```text
Wooden Plank      10
Metal Sheet       25
Chain             15
Tire              20
Propane Tank      10
Refrigerator      10
Mattress           2
Anvil               8
```

Total:

```text
100
```

---

# 37. Loot Randomization

Use a centralized seeded random utility.

Normal runs may generate a random seed.

Development builds should support:

```text
?seed=12345
```

Using the same seed should produce the same loot and enemy randomization sequence.

This makes bugs reproducible.

---

# 38. Zombie Base Behavior

Zombie AI should intentionally be simple.

Every zombie:

1. Spawns on the right.
2. Walks left toward the Core.
3. Continuously aims approximately toward the Core.
4. Fires whenever its weapon cooldown allows.
5. Does not seek cover.
6. Does not dodge.
7. Does not retreat.
8. Does not avoid friendly bullets.
9. Stops walking if physically blocked.
10. Continues shooting while blocked.
11. Resumes walking if the obstruction disappears.

No pathfinding is required.

---

# 39. Zombie Targeting

Zombies primarily aim toward:

```text
Core center
```

Apply weapon-specific random aim spread.

This causes bullet storms to hit different portions of the player's defenses.

---

# 40. Zombie Movement

Base zombie speed:

```text
45-70 px/sec
```

Exact speed depends on zombie type.

Zombies remain on the ground.

No jumping.

No climbing.

No complex navigation.

---

# 41. Required Zombie Types

Implement:

1. Pistol Zombie
2. Rifle Zombie
3. Shotgun Zombie
4. Sniper Zombie
5. Machine Gun Boss

---

# 42. Pistol Zombie

Stats:

```text
HP: 60

Move speed: 60 px/sec

Weapon:
Zombie Pistol
```

Weapon:

```text
Damage: 12

Fire rate:
1 shot every 0.8 sec

Bullet speed:
750 px/sec

Spread:
8 degrees
```

---

# 43. Rifle Zombie

Stats:

```text
HP: 75

Move speed: 55 px/sec
```

Weapon:

```text
Damage: 8

Fire rate:
5 shots/sec

Bullet speed:
900 px/sec

Spread:
12 degrees
```

Rifle zombies are the primary bullet-volume enemy.

---

# 44. Shotgun Zombie

Stats:

```text
HP: 100

Move speed: 70 px/sec
```

Weapon:

```text
Pellets per shot: 8

Damage per pellet: 6

Fire rate:
1 shot every 1.5 sec

Bullet speed:
700 px/sec

Spread:
28 degrees
```

Each pellet is a physical bullet.

---

# 45. Sniper Zombie

Stats:

```text
HP: 50

Move speed: 40 px/sec
```

Weapon:

```text
Damage: 70

Fire rate:
1 shot every 2.8 sec

Bullet speed:
1400 px/sec

Spread:
2 degrees
```

Sniper bullets use the same ricochet rules as every other projectile.

No special penetration is required for the MVP.

---

# 46. Machine Gun Boss

Wave 5 boss.

Visual size should be approximately:

```text
2x normal zombie
```

Stats:

```text
HP: 1600

Move speed: 30 px/sec
```

Weapon:

```text
Damage: 10

Fire rate:
10 shots/sec

Bullet speed:
950 px/sec

Spread:
15 degrees
```

The boss:

* Walks toward the Core
* Fires continuously
* Has no special AI
* Has no phases
* Can be killed normally
* Can be killed by falling objects
* Can be damaged by ricochets

The anvil must be capable of instantly or nearly instantly killing the boss from a meaningful fall height.

---

# 47. Wave Definitions

Use fixed MVP waves.

Do not dynamically scale enemies.

---

## Wave 1

```text
10 Pistol Zombies
```

Spawn interval:

```text
1.1 seconds
```

---

## Wave 2

```text
12 Pistol Zombies
4 Rifle Zombies
```

Spawn interval:

```text
0.9 seconds
```

---

## Wave 3

```text
10 Pistol Zombies
6 Rifle Zombies
4 Shotgun Zombies
```

Spawn interval:

```text
0.8 seconds
```

---

## Wave 4

```text
8 Pistol Zombies
8 Rifle Zombies
4 Shotgun Zombies
3 Sniper Zombies
```

Spawn interval:

```text
0.7 seconds
```

---

## Wave 5

```text
1 Machine Gun Boss
12 Rifle Zombies
6 Pistol Zombies
```

Spawn interval:

```text
0.65 seconds
```

Spawn the boss approximately halfway through the wave rather than first.

---

# 48. Spawn Randomization

Zombie ordering should be randomized within the wave while maintaining the defined counts.

Do not spawn enemies directly on top of one another.

Use slight spawn delay variation:

```text
±15%
```

---

# 49. Zombie Collision

Zombies collide with:

* Ground
* Core
* Solid build objects
* Heavy dynamic objects

Zombies do not need to collide with other zombies.

Allow zombies to overlap slightly to prevent traffic jams.

---

# 50. Zombie Death

When zombie HP reaches zero:

1. Zombie stops shooting.
2. Zombie is marked dead.
3. Remove zombie collision body.
4. Play placeholder death effect.
5. Increment appropriate kill statistic.

The MVP does not require persistent zombie corpses.

Remove corpse after a short visual animation.

---

# 51. Kill Attribution

Track kill causes.

Possible categories:

```ts
type KillCause =
  | "player"
  | "ricochet"
  | "crush"
  | "explosion";
```

If environmental damage finishes the zombie, record that cause.

---

# 52. Signature Anvil Interaction

The following interaction is a mandatory MVP acceptance test.

Player must be able to create:

```text
WOOD SUPPORT
      |
    CHAIN
      |
    ANVIL
```

During the wave:

1. Zombies fire bullets.
2. Bullets damage the wood support and/or chain.
3. Support eventually breaks.
4. Chain loses its support.
5. Anvil becomes dynamic.
6. Gravity causes the anvil to fall.
7. Boss is underneath the anvil.
8. Anvil collides with boss.
9. Impact damage kills the boss.
10. Anvil lands on the ground.
11. The anvil remains active as a metal object.
12. Remaining zombies continue firing.
13. A zombie bullet hits the fallen anvil.
14. Bullet ricochets.
15. Ricocheted bullet hits another zombie.
16. That zombie takes damage or dies.

If this interaction does not work reliably, the MVP is not complete.

---

# 53. Metal Ricochet Acceptance Test

Create a metal sheet at approximately 45 degrees.

Fire a zombie bullet at it.

Expected:

```text
Incoming bullet
        ↓
       /
      / metal
     /
   ↙ reflected bullet
```

Verify:

* Bullet reflects correctly
* Bullet loses speed
* Bullet loses damage
* Metal takes reduced damage
* Bullet can now hurt zombies

---

# 54. Wood Acceptance Test

Shoot wood.

Expected:

* Bullet disappears
* Wood loses full bullet damage
* Wood eventually breaks
* Unsupported structures above it fall

---

# 55. Mattress Acceptance Test

Shoot mattress repeatedly with rifle bullets.

Expected:

* Bullets disappear
* Mattress takes 35% damage
* Mattress eventually breaks
* No ricochets occur

---

# 56. Propane Acceptance Test

Shoot propane tank repeatedly.

Expected:

* Bullets ricochet
* Tank loses reduced metal damage
* HP reaches zero
* Tank explodes
* Nearby zombies take damage
* Nearby structures take damage
* Nearby dynamic objects receive impulse

---

# 57. Core Targeting Acceptance Test

Place no defenses.

Start Wave 1.

Expected:

* Zombies advance
* Zombies fire toward Core
* Bullets visibly vary because of spread
* Core takes damage
* Zombies stop advancing when reaching Core
* Zombies continue shooting
* Core eventually dies if player does nothing

---

# 58. Build Persistence

After completing a wave:

* Surviving objects remain where they were.
* Remaining HP is preserved.
* Dynamic objects remain in their final location if they still exist.

During Build mode:

The player may reposition any surviving item.

Once moved, physics velocity is reset.

---

# 59. Structure HP UI

When hovering over or selecting an object during Build mode:

Display:

```text
Metal Sheet

HP
420 / 500

Mass
25 kg

Material
Metal

RICHOCHETS BULLETS
```

During Wave mode, avoid displaying health bars over every structure permanently.

Optional:

Show a small damage indicator when the mouse hovers over an item.

---

# 60. Zombie UI

Normal zombies do not require visible HP bars.

Boss requires:

```text
BOSS
████████████████
```

Boss HP bar appears at the top of the Wave screen.

---

# 61. Wave HUD

Display:

```text
WAVE 3 / 5

Enemies remaining: 14

CORE
1040 / 1500

PLAYER
75 / 100
```

Optional counters:

```text
Ricochet Kills: 4
Crush Kills: 1
```

---

# 62. Wave Preview

During both Scavenge and Build screens, show the exact incoming enemy composition.

Example:

```text
NEXT WAVE

8 Pistol
8 Rifle
4 Shotgun
3 Sniper
```

This allows the player to make informed scavenging and building decisions.

---

# 63. Audio Requirements

Temporary audio is acceptable.

Required sound categories:

* Player pistol
* Zombie pistol
* Rifle
* Shotgun
* Sniper
* Machine gun
* Metal ricochet ping
* Wood impact
* Wood break
* Explosion
* Heavy-object impact
* Zombie death
* Wave start
* Wave complete

The game must include volume controls:

```text
Master Volume
Music Volume
SFX Volume
```

Music itself is optional for MVP.

---

# 64. Visual Requirements

Do not wait for final artwork.

Use simple readable placeholder graphics.

Examples:

```text
Player:
Blue rectangle/circle

Pistol Zombie:
Green

Rifle Zombie:
Dark green

Shotgun Zombie:
Orange-green

Sniper Zombie:
Purple-green

Boss:
Large red-green shape
```

Objects should have easily recognizable colors/textures.

Example:

```text
Wood:
Brown

Metal:
Gray

Mattress:
Light rectangle

Propane:
Red cylinder

Anvil:
Dark metal silhouette
```

Gameplay readability matters more than style.

---

# 65. Impact Feedback

The MVP should still feel satisfying.

Include lightweight effects:

## Bullet vs wood

* Small debris particles
* Wood impact sound

## Bullet vs metal

* Spark
* Metallic ping
* Visible ricochet

## Bullet vs zombie

* Hit flash
* Small particle burst

## Heavy crush

* Camera shake
* Large impact sound

## Explosion

* Flash
* Particle burst
* Camera shake

---

# 66. Camera Shake

Keep shake subtle.

Examples:

```text
Normal gun:
none

Shotgun:
very small

Sniper impact:
small

Anvil impact:
medium

Propane explosion:
medium
```

Do not make sustained rifle fire constantly shake the camera.

---

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

---

# 75. Error Handling

The game should not crash if:

* An attached object is destroyed
* A chain endpoint disappears
* Multiple supports break simultaneously
* A ricochet occurs on the same frame as object destruction
* An explosion destroys multiple connected structures
* A zombie dies while firing
* A bullet's source zombie is already dead

Destroyed entities should have a clear lifecycle:

```text
active
→ dying/destroyed
→ removed
```

Avoid processing the same destruction twice.

---

# 76. Physics Safety Rules

Clamp extremely high velocities.

Suggested maximum object velocity:

```text
1800 px/sec
```

Suggested maximum bullet velocity:

```text
1800 px/sec
```

Do not allow explosion impulse to produce unstable physics.

---

# 77. Debug Mode

Implement a development debug toggle.

Suggested:

```text
F2
```

Debug display may show:

* Physics bodies
* Collision normals
* Object HP
* Support graph
* Bullet ownership
* Bullet ricochet count
* FPS
* Active bullet count
* Active zombie count
* Random seed

This will significantly simplify physics debugging.

---

# 78. Development Spawn Tools

Development-only keyboard commands are recommended.

Example:

```text
1 Spawn Pistol Zombie

2 Spawn Rifle Zombie

3 Spawn Shotgun Zombie

4 Spawn Sniper Zombie

5 Spawn Boss

B Spawn bullet test

A Spawn Anvil

M Spawn Metal Sheet

P Spawn Propane Tank
```

These should not appear in production UI.

---

# 79. Automated Tests

Unit test the systems that do not depend on rendering.

Required unit tests:

## Ricochet math

Test reflection from:

```text
Horizontal surface
Vertical surface
45-degree surface
```

## Damage multipliers

Verify:

```text
Wood = 100%

Metal = 25%

Soft = 35%
```

## Loot generation

Verify:

* Always returns six items
* Slot 1 is structural
* Weighted tables function
* Same seed produces same result

## Wave data

Verify defined enemy counts.

## Crush damage

Verify:

* Slow falling object causes no crush damage
* Fast heavy object causes damage
* Damage caps correctly

## Kill attribution

Verify ricochet/crush/explosion/player kills.

---

# 80. Manual Physics QA

Because physics interactions are difficult to fully unit test, manually test:

1. Angled metal ricochet.
2. Multiple ricochets.
3. Metal destruction.
4. Wood support collapse.
5. Chain break.
6. Hanging anvil fall.
7. Anvil boss kill.
8. Fallen anvil ricochet.
9. Refrigerator falling damage.
10. Propane chain reaction.
11. Tire rolling.
12. Mattress absorption.
13. Explosion destroying supports.
14. Multiple structures collapsing simultaneously.
15. Player shooting own structure.

---

# 81. MVP Milestone 1 — Physics Sandbox

Build only:

* Ground
* One zombie
* Bullets
* Wood
* Metal

Success criteria:

* Zombie fires physical bullets.
* Wood absorbs bullets.
* Metal ricochets bullets.
* Ricocheted zombie bullets can hurt zombies.

Do not proceed until this interaction feels reliable.

---

# 82. MVP Milestone 2 — Structural Collapse

Add:

* Support graph
* Gravity
* Unsupported objects
* Heavy object damage

Success criteria:

A heavy object can rest above a zombie, lose support, fall, and damage the zombie.

---

# 83. MVP Milestone 3 — Anvil Scenario

Add:

* Chain
* Anvil
* Boss

Success criteria:

The complete signature anvil interaction works.

This is the most important milestone.

---

# 84. MVP Milestone 4 — Build System

Add:

* Inventory
* Placement
* Rotation
* Removal
* Valid placement rules
* Structure persistence

Success criteria:

A player can construct a functional defensive structure without developer tools.

---

# 85. MVP Milestone 5 — Scavenging

Add:

* Three scavenging locations
* Weighted loot
* Six-item rewards
* Loot reveal screen

Success criteria:

Different locations produce visibly different inventory tendencies.

---

# 86. MVP Milestone 6 — Full Enemy Set

Add:

* Pistol Zombie
* Rifle Zombie
* Shotgun Zombie
* Sniper Zombie
* Boss

Success criteria:

Each enemy produces a noticeably different bullet threat.

---

# 87. MVP Milestone 7 — Full Run

Add all five waves.

Success criteria:

Player can:

```text
Start new run
→ Scavenge
→ Build
→ Fight
→ Repeat
→ Beat Wave 5
→ Reach Victory screen
```

Game-over state must also function.

---

# 88. MVP Milestone 8 — Feedback and Polish

Add:

* SFX
* Sparks
* Wood debris
* Hit flashes
* Camera shake
* Wave UI
* Results statistics
* Tooltips

No major new mechanics should be added at this stage.

---

# 89. Definition of MVP Complete

The MVP is complete when all of the following are true:

* Game loads in a browser.
* New run can be started.
* Five-wave run can be completed.
* Three scavenging locations exist.
* Loot is randomized.
* Inventory persists between waves.
* Eight required junk objects exist.
* Objects can be placed and rotated.
* Structures have physical support relationships.
* Supports can break.
* Unsupported objects can fall.
* Player can move and shoot.
* Five zombie types exist.
* Zombies continuously fire while advancing.
* Four zombie weapon behaviors exist.
* Physical bullets exist.
* Wood absorbs bullets.
* Soft objects absorb bullets.
* Metal always ricochets bullets.
* Ricocheted zombie bullets can hurt zombies.
* Propane tanks explode.
* Heavy objects can crush zombies.
* Anvil can kill boss.
* Fallen anvil continues reflecting bullets.
* Core can be destroyed.
* Player can die.
* Wave results display kill types.
* Victory state works.
* Game-over state works.
* Game is stable during Wave 5.
* No major physics crashes occur.

---

# 90. Explicitly Out of Scope

Do NOT add these to the MVP.

## No player progression system

No:

* XP
* Leveling
* Skill tree
* Permanent upgrades
* Character classes

---

## No currency

No:

* Money
* Scrap currency
* Shops
* Buying materials
* Selling materials

The player's resources come from scavenging.

---

## No crafting

Do not combine items into recipes.

Example:

```text
2 metal + wood = turret
```

is not part of the MVP.

---

## No automated turrets

The MVP focuses on physical defenses.

Turrets may be explored later.

---

## No melee zombies

All MVP zombies have firearms.

---

## No intelligent enemy AI

No:

* Cover
* Flanking
* Tactical targeting
* Avoiding hazards
* Retreating
* Pathfinding

---

## No procedural maps

Use one arena.

---

## No scavenging gameplay

Scavenging is currently a location choice plus randomized loot.

Do not build an explorable scavenging level.

---

## No online multiplayer

Single-player only.

---

## No accounts

No login system.

---

## No cloud saves

No backend required.

---

## No leaderboards

No online scoring.

---

## No mobile controls

Desktop web first.

---

## No iOS build

Do not begin iOS packaging until the browser MVP proves fun.

---

## No final art requirement

Placeholder shapes and temporary assets are acceptable.

---

# 91. Design Principles

When making decisions that are not explicitly covered above, follow these priorities.

## Principle 1

Physics should create solutions.

Do not solve every interaction with special-case scripting.

---

## Principle 2

Objects should have tradeoffs.

Avoid:

```text
Wood
→ Better Wood
→ Steel
→ Better Steel
```

The player should choose objects because of their behavior.

---

## Principle 3

Metal is powerful but scarce.

Metal should feel exciting because it allows players to weaponize zombie bullets.

---

## Principle 4

Random loot should create problems.

The player should sometimes think:

> I didn't get what I wanted. How do I make this work?

---

## Principle 5

Random loot should not create impossible runs.

The guaranteed structural item exists to prevent completely unusable scavenging results.

---

## Principle 6

The zombie horde should appear dangerous but stupid.

Individual zombies are simple.

The threat comes from:

* Numbers
* Different gun types
* Huge projectile volume

---

## Principle 7

Player shooting is secondary.

The player's pistol helps deal with immediate threats.

It should not replace defensive construction as the primary strategy.

---

## Principle 8

Failure should be visually understandable.

The player should see:

```text
Metal deflected bullets.

Wood cracked.

Support broke.

Anvil fell.

Propane exploded.

Base collapsed.
```

Avoid invisible numerical systems whenever a physical representation is possible.

---

# 92. Primary Fun Test

During internal playtesting, repeatedly ask:

> Do players spend time experimenting with object placement because they are curious what will happen?

Strong positive signals:

* Players deliberately angle metal.
* Players hang heavy objects.
* Players try to cause zombie friendly fire.
* Players intentionally create weak supports.
* Players laugh when a structure unexpectedly collapses.
* Players create traps the designers did not explicitly plan.
* Players want to immediately retry with a different scavenging location.

Weak signals:

* Players simply stack the highest-HP objects in front of the Core.
* Players ignore most loot.
* Players kill nearly everything with the pistol.
* Metal placement angle doesn't matter.
* Physics feels random rather than understandable.
* Players cannot tell why they died.

---

# 93. First Important Balancing Question

The most important balance relationship is:

```text
Zombie Bullet Pressure
vs
Available Defensive Material
```

The player should usually feel:

```text
"I probably have enough junk to survive this,
but only if I arrange it intelligently."
```

Not:

```text
"I obviously have enough."
```

and not:

```text
"This loot roll made winning impossible."
```

---

# 94. Final MVP Experience

A representative successful run should produce moments like this:

The player sees that Wave 5 contains:

```text
Machine Gun Boss
12 Rifle Zombies
6 Pistol Zombies
```

The player chooses:

```text
JUNKYARD
```

because they want metal and heavy objects.

They receive:

```text
Wooden Plank
Metal Sheet
Chain
Tire
Metal Sheet
Anvil
```

The player constructs:

```text
         WOOD SUPPORT
               |
             CHAIN
               |
             ANVIL

            /
           / METAL
          /

       [CORE]
       PLAYER
```

Wave begins.

Rifle zombies fill the screen with bullets.

Bullets strike the angled metal.

Several shots ricochet back into the horde.

The wooden support slowly loses HP.

The boss advances underneath the hanging anvil.

Machine-gun fire destroys the support.

The anvil falls.

The boss is crushed.

The anvil lands.

Remaining zombies continue firing.

Their bullets strike the fallen anvil.

Those bullets ricochet back into the remaining zombies.

The player survives.

The game displays:

```text
WAVE COMPLETE

19 Player Kills
12 Ricochet Kills
4 Crush Kills
3 Explosion Kills

YOU SURVIVED
```

If the MVP can reliably create scenarios like this using simple placeholder graphics, the core concept has been successfully proven.
