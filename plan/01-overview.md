# 1. Product Summary

## Working concept

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