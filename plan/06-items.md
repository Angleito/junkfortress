# 31. Required MVP Items

Implement exactly these eight scavengable objects first.

---

## 31.1 Wooden Plank

Purpose:

Basic construction.

Stats:

```text
Material: Wood

HP: 250

Mass: 8 kg

Size:
160 x 22 px
```

Behavior:

* Absorbs bullets
* Common
* Useful as supports
* Can hold hanging objects
* Breaks relatively easily

---

## 31.2 Metal Sheet

Purpose:

Bullet reflection.

Stats:

```text
Material: Metal

HP: 500

Mass: 25 kg

Size:
150 x 18 px
```

Behavior:

* Ricochets bullets
* Stronger than wood
* Heavier than wood
* Excellent when angled

---

## 31.3 Chain

Stats:

```text
Material: Metal

HP: 80

Maximum length: 220 px
```

Behavior:

* Ricochets bullets if directly hit
* Holds hanging objects
* Breaks after enough damage

---

## 31.4 Anvil

Signature item.

Stats:

```text
Material: Metal

HP: 1400

Mass: 100 kg

Size:
70 x 45 px
```

Behavior:

* Ricochets bullets
* Extremely heavy
* Excellent falling weapon
* Can be suspended from chain
* Can kill the boss with sufficient falling velocity

Once the anvil lands, it remains a physical metal object.

Bullets hitting the fallen anvil must continue ricocheting.

---

## 31.5 Tire

Stats:

```text
Material: Soft

HP: 400

Mass: 15 kg

Diameter:
64 px
```

Behavior:

* Absorbs bullets
* Round dynamic object when unsupported
* Can roll
* Takes reduced bullet damage

---

## 31.6 Propane Tank

Stats:

```text
Material: Metal

HP: 180

Mass: 22 kg

Size:
42 x 90 px
```

Behavior:

* Ricochets bullets
* Takes reduced metal damage
* Explodes when HP reaches zero

Explosion:

```text
Radius: 130 px

Zombie damage: 250

Player damage: 100

Structure damage: 100

Core damage: 100
```

Explosion also applies physics impulse to nearby dynamic objects.

---

## 31.7 Refrigerator

Stats:

```text
Material: Metal

HP: 900

Mass: 45 kg

Size:
80 x 130 px
```

Behavior:

* Ricochets bullets
* Heavy
* Strong defensive object
* Can become a falling trap

---

## 31.8 Mattress

Stats:

```text
Material: Soft

HP: 500

Mass: 12 kg

Size:
150 x 55 px
```

Behavior:

* Absorbs bullets
* Takes only 35% bullet damage
* Does not ricochet
* Useful against rapid-fire enemies
* Relatively light

---

# 32. Item Data Architecture

Item statistics must live in data files rather than entity code.

Example:

```ts
interface ItemDefinition {
  id: string;
  name: string;

  material: Material;

  maxHp: number;
  massKg: number;

  width: number;
  height: number;

  shape: "rectangle" | "circle" | "chain";

  explosive?: boolean;
  explosionRadius?: number;

  canSupport?: boolean;
  dynamicWhenUnsupported?: boolean;
}
```

Suggested file:

```text
src/data/items.ts
```