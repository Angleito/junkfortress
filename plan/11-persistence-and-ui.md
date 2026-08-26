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