# 33. Scavenging System

Each scavenging trip gives:

```text
6 items
```

Slot 1 is guaranteed to be a basic structural object.

Slot 1:

```text
70% Wooden Plank
30% Metal Sheet
```

Slots 2-6 use the selected location's weighted loot table.

Duplicates are allowed.

---

# 34. Hardware Store Loot Table

For slots 2-6:

```text
Wooden Plank      35
Metal Sheet       20
Chain             15
Tire               5
Propane Tank       5
Refrigerator       5
Mattress           10
Anvil               5
```

Total weight:

```text
100
```

---

# 35. Restaurant Loot Table

```text
Wooden Plank      15
Metal Sheet       10
Chain              5
Tire               5
Propane Tank      25
Refrigerator      25
Mattress          10
Anvil               5
```

Total:

```text
100
```

---

# 36. Junkyard Loot Table

```text
Wooden Plank      10
Metal Sheet       25
Chain             15
Tire              20
Propane Tank      10
Refrigerator      10
Mattress           2
Anvil               8
```

Total:

```text
100
```

---

# 37. Loot Randomization

Use a centralized seeded random utility.

Normal runs may generate a random seed.

Development builds should support:

```text
?seed=12345
```

Using the same seed should produce the same loot and enemy randomization sequence.

This makes bugs reproducible.