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