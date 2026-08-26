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