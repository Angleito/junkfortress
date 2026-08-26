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