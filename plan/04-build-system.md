# 13. Build Inventory

Inventory persists for the entire run.

Items that are not placed remain available next wave.

Placed objects that survive remain placed after the wave.

During the next Build phase, surviving objects may be:

* Moved
* Rotated
* Removed back into inventory

Destroyed objects are permanently lost.

Objects do not automatically repair.

---

# 14. Build Controls

During Build mode:

```text
Left Click inventory item
Select item

Mouse
Position ghost object

Q
Rotate -15 degrees

E
Rotate +15 degrees

Left Click
Place item

Right Click
Cancel placement

Left Click placed object
Select object

Delete / Backspace
Return selected object to inventory
```

A visible transparent ghost must show intended placement.

Valid placement:

```text
Green outline
```

Invalid placement:

```text
Red outline
```

---

# 15. Build Placement Rules

Objects cannot:

* Overlap the Core
* Overlap the player spawn zone
* Be placed outside the build zone
* Begin inside another solid object

Standard structural objects must be connected to:

* Ground
* Core foundation
* Another supported structure

Heavy objects may hang from chains.

---

# 16. Structural Support System

The MVP requires a simplified support graph.

Each placed object is a node.

Objects touching one another create support connections.

The following count as permanent support roots:

```text
Ground
Core foundation
```

An object is supported if a path exists from that object to a support root.

Example:

```text
GROUND
   |
WOOD
   |
WOOD
   |
METAL
```

All are supported.

If the bottom piece is destroyed:

```text
GROUND

WOOD
 |
WOOD
 |
METAL
```

The remaining objects lose support.

Unsupported objects become dynamic Matter physics bodies.

Gravity then affects them.

---

# 17. Physics Behavior During Build Phase

While building:

Placed structural objects should remain stationary.

Physics simulation may be paused or bodies temporarily static.

The player must be able to create structures without them collapsing while being edited.

---

# 18. Physics Behavior During Wave Phase

When the wave begins:

Supported structures remain static.

Unsupported structures become dynamic.

When structural objects are destroyed:

1. Remove the object.
2. Recalculate support for connected objects.
3. Any newly unsupported object becomes dynamic.
4. Gravity acts on it.

This creates collapses.

---

# 19. Gravity

Use normal downward gravity.

Suggested Matter gravity:

```text
Y gravity scale: 1
```

Tune actual acceleration until falling objects feel visually readable rather than excessively fast.

---

# 20. Chains

Chains are required for the MVP because they enable the signature anvil trap.

Chains are simplified constraints rather than fully simulated multi-link chains.

## Chain properties

```text
HP: 80
Material: metal
Bullet response: ricochet
```

Chain rendering:

A visible line between two anchor points.

Chain placement requires two clicks:

```text
Click anchor point A
Click anchor point B
```

Valid endpoints:

* Structural object
* Heavy object
* Metal object
* Wood object

Maximum chain length:

```text
220 px
```

A chain creates a Matter constraint.

If the chain reaches zero HP:

* Destroy constraint
* Any formerly hanging object becomes unsupported
* Object falls