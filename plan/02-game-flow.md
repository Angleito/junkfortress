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