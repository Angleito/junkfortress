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