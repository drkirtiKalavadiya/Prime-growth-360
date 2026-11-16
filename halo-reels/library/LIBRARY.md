# Library codes → plan (for Claude)

The creator orders with codes from `LIBRARY.pdf`. Map them like this. Times always come from their words.

## Themes
| Code | Plan |
|---|---|
| N1 Noir | `"theme": "noir"` |
| N2 Arctic | `"theme": "arctic"` |
| N3 Ember | `"theme": "ember"` |
| N4 Brand | `"theme": "noir", "accent": "#RRGGBB"` (ask for the hex code, or read it from their logo) |
| +IT | `"accent_style": "italic"` (italic serif accent instead of the upright one) |

## Elements
| Code | Scene | Plan element |
|---|---|---|
| CAP | any | `{"el": "caption", "top": [[w, "@w"], …], "accent": [w, "@w"], "bottom": [[w, "@w"], …], "y": 1330}` |
| HED | speaker | `{"el": "headword", "top": [[w, "@w"]], "accent": [w, "@w"]}` |
| CRD | speaker | `{"el": "card", "kicker": "…", "title": "Most *creators*", "rows": [[label, "@w"], …]}` |
| PIL | any | `{"el": "chips", "y": 1640, "items": [[label, "@w"], …]}` |
| PNL | abstract | `{"el": "panels", "y": 330, "items": [[label, "@w"], …]}` (2–3) |
| CNT | abstract | `{"el": "counter", "t": "@client", "to": 50000, "prefix": "$", "label": "a month", "dur": 1.1, "y": 700}` |
| BDG | any | `{"el": "badge", "t": "@w", "text": "100%", "ring": "  ✦  FREE  ✦  SIMPLE", "x": 540, "y": 720, "rotate": 0}` |
| NTF | any (once) | `{"el": "notify", "t": "@w", "app": "Instagram", "title": "New comment", "text": "GROWTH", "icon": "✦"}` |
| ORB | speaker | automatic; `"ring": false` on the scene to remove it |

## Recipes (ready orders)
| Code | Scenes |
|---|---|
| R1 Authority | 1 CRD + CAP · 2 PNL + CAP · 3 HED + CAP + PIL · 4 CNT + CAP · 5 NTF + CAP (the example plan) |
| R2 Minimal | 1 CAP · 2 CAP · 3 HED + CAP · 4 BDG + CAP · 5 CAP |
| R3 Proof | 1 HED + CAP · 2 CNT + CAP · 3 CRD + CAP · 4 PNL + CAP · 5 BDG + CAP |

"You choose" = R1, adapted to what is said (a number → CNT, a list → CRD or PNL, a call to action → NTF or BDG).

Counter timing: it must reach its number before the scene cut (`t` + 0.1 + `dur` < scene `to`).
