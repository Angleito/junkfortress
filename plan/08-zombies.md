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