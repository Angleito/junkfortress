# 52. Signature Anvil Interaction

The following interaction is a mandatory MVP acceptance test.

Player must be able to create:

```text
WOOD SUPPORT
      |
    CHAIN
      |
    ANVIL
```

During the wave:

1. Zombies fire bullets.
2. Bullets damage the wood support and/or chain.
3. Support eventually breaks.
4. Chain loses its support.
5. Anvil becomes dynamic.
6. Gravity causes the anvil to fall.
7. Boss is underneath the anvil.
8. Anvil collides with boss.
9. Impact damage kills the boss.
10. Anvil lands on the ground.
11. The anvil remains active as a metal object.
12. Remaining zombies continue firing.
13. A zombie bullet hits the fallen anvil.
14. Bullet ricochets.
15. Ricocheted bullet hits another zombie.
16. That zombie takes damage or dies.

If this interaction does not work reliably, the MVP is not complete.

---

# 53. Metal Ricochet Acceptance Test

Create a metal sheet at approximately 45 degrees.

Fire a zombie bullet at it.

Expected:

```text
Incoming bullet
        ↓
       /
      / metal
     /
   ↙ reflected bullet
```

Verify:

* Bullet reflects correctly
* Bullet loses speed
* Bullet loses damage
* Metal takes reduced damage
* Bullet can now hurt zombies

---

# 54. Wood Acceptance Test

Shoot wood.

Expected:

* Bullet disappears
* Wood loses full bullet damage
* Wood eventually breaks
* Unsupported structures above it fall

---

# 55. Mattress Acceptance Test

Shoot mattress repeatedly with rifle bullets.

Expected:

* Bullets disappear
* Mattress takes 35% damage
* Mattress eventually breaks
* No ricochets occur

---

# 56. Propane Acceptance Test

Shoot propane tank repeatedly.

Expected:

* Bullets ricochet
* Tank loses reduced metal damage
* HP reaches zero
* Tank explodes
* Nearby zombies take damage
* Nearby structures take damage
* Nearby dynamic objects receive impulse

---

# 57. Core Targeting Acceptance Test

Place no defenses.

Start Wave 1.

Expected:

* Zombies advance
* Zombies fire toward Core
* Bullets visibly vary because of spread
* Core takes damage
* Zombies stop advancing when reaching Core
* Zombies continue shooting
* Core eventually dies if player does nothing