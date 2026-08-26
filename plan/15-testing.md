# 79. Automated Tests

Unit test the systems that do not depend on rendering.

Required unit tests:

## Ricochet math

Test reflection from:

```text
Horizontal surface
Vertical surface
45-degree surface
```

## Damage multipliers

Verify:

```text
Wood = 100%

Metal = 25%

Soft = 35%
```

## Loot generation

Verify:

* Always returns six items
* Slot 1 is structural
* Weighted tables function
* Same seed produces same result

## Wave data

Verify defined enemy counts.

## Crush damage

Verify:

* Slow falling object causes no crush damage
* Fast heavy object causes damage
* Damage caps correctly

## Kill attribution

Verify ricochet/crush/explosion/player kills.

---

# 80. Manual Physics QA

Because physics interactions are difficult to fully unit test, manually test:

1. Angled metal ricochet.
2. Multiple ricochets.
3. Metal destruction.
4. Wood support collapse.
5. Chain break.
6. Hanging anvil fall.
7. Anvil boss kill.
8. Fallen anvil ricochet.
9. Refrigerator falling damage.
10. Propane chain reaction.
11. Tire rolling.
12. Mattress absorption.
13. Explosion destroying supports.
14. Multiple structures collapsing simultaneously.
15. Player shooting own structure.