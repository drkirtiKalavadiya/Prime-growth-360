# Style guide

The look is an explainer on cream paper, with editorial type and one accent colour.

## Frame
- 9:16, designed at 540×960 CSS px and rendered at 2× (1080×1920), 30 fps.
- Top to bottom: **kicker** (`// 04 · step 2 · folder`, mono, tiny, grey) → **caption**
  (Space Grotesk 28px, revealed word by word as it's spoken) → **label** (Anton, uppercase,
  with a black step **badge**) → **visual** (centre stage).
- Background: `light` (paper `#f1eee8`) or `dark` (corkboard, for the hook only).

## Colour and type
| role | value |
|---|---|
| ink | `#141414` |
| accent | `#e1251b`, for emphasis only, never decoration |
| caption | Space Grotesk 500 |
| emphasis | Instrument Serif *italic*, red. Write it as `*word*` |
| display label | Anton, uppercase. Write `*WORD*` for the red part |
| kicker / code | JetBrains Mono |
| Gujarati | Hind Vadodara (caption), Noto Serif Gujarati (emphasis, upright, never fake-italic), Baloo Bhai 2 (labels). Set `"lang": "gu"` |

## Motion
- Everything enters (`rise`, `pop`, `drop`, `stamp`, `slide`). Nothing just appears.
- Something moves in every second: camera drift, spinners, typing, waveform.
- Use `"transition": "halftone"` for chapter breaks (a new step), and a plain cut inside a step.
- Confetti only for the payoff ("now the fun part").

## Visual types (`scene.visual`, a single object or an array)
| type | key fields |
|---|---|
| `board` | `cards[]`, `note`, `stamp {top, big, at}` (the corkboard hook) |
| `steps` | `items[{title, sub}]`, `hot` (number) or `sweep: true` + `until` |
| `appIcon` | `name` |
| `versus` | `bad`, `good`, `goodAt` |
| `window` | `title`, `sub`, `rows[{kind: check\|progress\|text\|file, text, pill, meta, at, doneAt, hl}]`, `menu {items, select, at, until}`, `chips[{text, at, hotAt}]`, `prompt {text, at, cps}`, `placeholder` |
| `finder` | `folder` (the name gets typed), `hint` |
| `folder` | `name`, `files[]`, `count` |
| `number` | `n`, `of` |
| `phone` | `title`, `steps[{text, at}]`, `until`, `captions[]` |
| `feedback` | `file`, `phoneTitle`, `checks[]`, `ask {text, at}`, `fix`, `fixedAt` |
| `cta` | `pre`, `word`, `bubble` |

Scene extras: `fx: [{type: "confetti"|"ring", at, x, y}]`, `hold` (seconds after the last word),
`minDuration`, `labelAt`.
