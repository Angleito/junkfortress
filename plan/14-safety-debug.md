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