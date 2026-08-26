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