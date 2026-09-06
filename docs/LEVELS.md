# ChromaWeave Levels

ChromaWeave ships with 12 handcrafted levels split into three difficulty groups. Each level is defined by a palette, grid size, and optional interior anchors or control points.

---

## Beginner — gentle introductions

| ID | Name | Grid | Palette corners | Notes |
|----|------|------|-----------------|-------|
| l1 | Sunset Breeze | 4×4 | `#FFD89B` → `#FF7E5F` → `#FEB47B` → `#C04848` | Warm, high-contrast sunset gradient |
| l2 | Mint Lagoon | 5×5 | `#A8FFCE` → `#5BC0BE` → `#3FC1C9` → `#0B4F6C` | Cool aqua-to-teal flow |
| l3 | Lavender Dawn | 5×5 | `#F5C6FF` → `#FBC2EB` → `#A18CD1` → `#5B6CFF` | Soft pastel purples |
| l4 | Peach Whisper | 5×5 | `#FFE5D9` → `#FFB5A7` → `#FCD5CE` → `#F08080` | Delicate warm pinks |

**Design goal:** teach the drag-and-swap mechanic and let players see clear color relationships.

---

## Casual — sharper observation

| ID | Name | Grid | Palette corners | Notes |
|----|------|------|-----------------|-------|
| l5 | Forest Canopy | 6×6 | `#DCE35B` → `#45B649` → `#134E5E` → `#71B280` | Earthy greens with a deep corner |
| l6 | Ocean Depths | 7×7 | `#43CEA2` → `#185A9D` → `#0F2027` → `#2C5364` | Dark ocean floor atmosphere |
| l7 | Berry Bloom | 6×6 | `#FF9A9E` → `#FAD0C4` → `#A18CD1` → `#FBC2EB` | Pink-to-lavender romance |
| l8 | Golden Hour | 7×7 | `#FFE259` → `#FFA751` → `#F7971E` → `#C0392B` | Fiery oranges and golds |

**Design goal:** require players to compare more neighbors and follow subtler transitions.

---

## Master — meditative complexity

| ID | Name | Grid | Palette + extras | Interior anchors |
|----|------|------|------------------|------------------|
| l9 | Aurora Borealis | 9×9 | corners + mint/cyan control points | `[4,4]` |
| l10 | Neon Cyberpunk | 9×9 | corners + gold control point | `[3,6]` |
| l11 | Cosmic Drift | 10×10 | corners + purple/violet control points | `[4,3]` |
| l12 | Volcanic Embers | 10×10 | corners + orange control point | `[3,3]`, `[6,6]` |

**Design goal:** introduce non-linear gradients and multiple fixed reference points, turning each level into a slow, satisfying spatial puzzle.

---

## Unlocking

- Level `l1` is unlocked by default.
- Completing any level unlocks the next one in sequence.
- The gallery shows locked levels blurred and grayscale until unlocked.
- Best move counts are stored locally and in the cloud when signed in.
