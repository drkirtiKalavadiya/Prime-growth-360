"""દ્વારકા કેમ ડૂબી ગઈ? — about 2:17, Gujarati, cork evidence wall.

One wall: the India map on the right, a column of evidence clusters out on the cork to its west
(off the map sheet, which ends at x = -9300). Dwarka sits near the sheet's west edge, so every
cluster ties back to it with red string. Every time comes from the voiceover (doc.L / doc.E / doc.W).

All prints are AI illustrations supplied by the owner and carry an "AI ચિત્ર" label. None is used
as evidence: names, dates and finds are typed in code on cards, never put on a picture of a person.
"""
from engine import HILITE, RED, WHITE, BigText, Card, Film, GeoMap, PenMark, Print, Route, Stamp, StringLine, XMarker

K = 60000
COLS = (-23300, -19800, -16300)      # three print columns on the cork, west of the map
PW = 2500                             # print width
AI = "AI ચિત્ર"
DARK = (30, 26, 22)
LBL = dict(size=5.0, label_size=420)


def build_film(doc):
    L, E, W = doc.L, doc.E, doc.W
    film = Film(doc.duration, fps=30, look="wall")
    cam, foc, shot, cue = film.cam, film.focus, film.shot, film.cue

    m = film.add(GeoMap(doc.map("india"), K, look="explainer"))
    dw, bet, mth = m.place("Dwarka"), m.place("Bet Dwarka"), m.place("Mathura")

    def pr(key, x, y, t, rot=0.0, w=PW, label=AI, **kw):
        return film.add(Print(key, x, y, w, rot=rot, t_in=t, label=label, label_t=t + 0.5, **kw))

    def top(p):
        return doc.on(p, 0.5, 0.03)

    # ============================================================ COLD OPEN (1-3)   y ~ -8000
    y1 = -8000
    a18 = pr("A18", COLS[0], y1, L(1) + 0.1, rot=-1.5)
    film.add(BigText("અરબી સમુદ્ર · ગુજરાત", COLS[0], y1 - 2350, 230, W(1, "અરબી") - 0.1, t_out=E(3) + 0.5,
                     type_on=0.6, bar=HILITE, bar_h=0.92, rgb=DARK, shadow=False))
    a01 = pr("A01", COLS[1] + 300, y1 + 100, L(2) + 0.1, rot=1.4)
    film.add(StringLine(top(a01), dw, t_in=W(2, "દ્વારકાના") - 0.2, dur=1.0, sag=0.03, width=18, persist=True))
    film.add(XMarker(*dw, "દ્વારકા", t_in=W(2, "દ્વારકાના") + 0.6, side="left", **LBL))
    title_t = W(3, "કેમ") - 0.15
    film.add(BigText("દ્વારકા કેમ ડૂબી ગઈ?", COLS[1] + 150, y1 + 2750, 560, title_t, rgb=(244, 240, 232), hit=0.9))
    film.add(PenMark("underline", COLS[1] + 150, y1 + 2950, 6200, 40, t_in=title_t + 0.5, dur=0.6, width=30, seed=4, rgb=RED))

    shot(0.0, COLS[0], y1 - 900, 0.48, -0.8)
    shot(W(1, "અરબી"), COLS[0], y1 - 1300, 0.55, -0.4)
    shot(E(1) - 0.2, COLS[0], y1, 0.5, 0.0)
    shot(L(2) + 0.6, COLS[1] + 300, y1, 0.54, 0.6)
    shot(W(2, "દ્વારકાના") + 0.3, -12500, y1 + 4300, 0.17, 0.0, strength=0.25)     # the string runs to Dwarka
    shot(E(2) + 0.2, -12200, y1 + 4500, 0.165, 0.0, strength=0.2)
    shot(title_t + 0.3, COLS[1] + 150, y1 + 1800, 0.46, -0.3)
    shot(E(3) + 0.9, COLS[1] + 150, y1 + 1900, 0.44, 0.0)

    # ============================================================ THE LEGEND (4-7)   y ~ -1500
    y2 = -1500
    a14 = pr("A14", COLS[0], y2, L(4) + 0.05, rot=-1.0)
    film.add(XMarker(*mth, "મથુરા", t_in=W(5, "મથુરા") - 0.1, side="right", **LBL))
    film.add(Route(mth, dw, t_in=W(5, "છોડીને"), dur=2.2, bend=-0.2, width=70))
    a13 = pr("A13", COLS[1], y2, L(6) + 0.05, rot=1.2)
    film.add(StringLine(top(a13), dw, t_in=L(6) + 0.3, dur=0.8, sag=0.03, width=16))
    film.add(BigText("ગોમતી સંગમ", COLS[1], y2 + 2350, 230, W(6, "સંગમ") - 0.1, type_on=0.5,
                     bar=HILITE, bar_h=0.92, rgb=DARK, shadow=False))
    a02 = pr("A02", COLS[2] + 300, y2 - 100, L(7) + 0.05, rot=-1.3)
    film.add(BigText("હરિવંશ", COLS[2] + 300, y2 + 2350, 260, W(7, "હરિવંશની"), type_on=0.4,
                     bar=HILITE, bar_h=0.92, rgb=DARK, shadow=False))

    shot(L(4) + 0.4, COLS[0], y2 - 300, 0.5, -0.6)
    shot(E(4) - 0.1, COLS[0], y2, 0.52, -0.3)
    shot(W(5, "છોડીને") + 0.2, -2600, -2200, 0.21, 0.0, radius=9000, strength=0.2)  # the map: Mathura to Dwarka
    shot(E(5) - 0.3, -4800, -1000, 0.24, 0.0, radius=8000, strength=0.2)
    shot(L(6) + 0.5, COLS[1], y2 + 400, 0.48, 0.4)
    shot(E(6) - 0.1, COLS[1], y2 + 900, 0.52, 0.2)
    shot(L(7) + 0.5, COLS[2] + 300, y2 + 200, 0.5, -0.4)
    shot(E(7) + 0.3, COLS[2] + 300, y2 + 900, 0.52, -0.2)

    # ============================================================ THE FALL (9-12)   y ~ 5000
    y3 = 5000
    cue("riser", L(9) - 1.2, 0.45, dur=1.1)
    a03 = pr("A03", COLS[0], y3, L(9) + 0.05, rot=1.2)
    film.add(BigText("૩૬ વર્ષ", COLS[0], y3 + 2450, 330, W(9, "છત્રીસમું") - 0.05, bar=HILITE, bar_h=0.92, rgb=DARK, shadow=False, hit=0.6))
    film.add(Stamp("શ્રાપ", COLS[0], y3 + 300, size=420, rot=-9, t_in=W(10, "શ્રાપ") - 0.05))
    a16 = pr("A16", COLS[1], y3 - 100, L(11) + 0.05, rot=-1.4)
    a17 = pr("A17", COLS[2] + 300, y3, L(12) + 0.05, rot=1.0)
    film.add(BigText("મૌસલ પર્વ", COLS[2] + 300, y3 + 2450, 260, W(12, "દરિયાએ") - 0.1, type_on=0.4,
                     bar=HILITE, bar_h=0.92, rgb=DARK, shadow=False))
    film.shake(W(12, "ગળી"), 26, 0.6)
    cue("boom", W(12, "ગળી"), 0.5)

    shot(L(9) + 0.4, COLS[0], y3 + 700, 0.48, 0.4)
    shot(E(9) + 0.1, COLS[0], y3 + 900, 0.5, 0.2)
    shot(W(10, "શ્રાપ") + 0.25, COLS[0], y3 + 300, 0.8, -0.6)
    shot(E(10), COLS[0], y3 + 200, 0.84, -0.8)
    shot(L(11) + 0.5, COLS[1], y3, 0.5, 0.6)
    shot(E(11), COLS[1], y3 + 200, 0.52, 0.4)
    shot(L(12) + 0.5, COLS[2] + 300, y3, 0.5, -0.4)
    shot(E(12) + 0.4, COLS[2] + 300, y3 + 900, 0.48, -0.2)

    # ============================================================ THE SEARCH (13-17)   y ~ 11500
    y4 = 11500
    film.add(BigText("કથા કે ઇતિહાસ?", COLS[1], y4 - 2900, 500, W(13, "કથા") - 0.1, rgb=(244, 240, 232), hit=0.7))
    a22 = pr("A22", COLS[0], y4, L(14) + 0.05, rot=-1.2)
    film.add(Card(COLS[0], y4 + 2900, 2700, 1250, W(14, "રાવની") - 0.3, title="ડૉ. એસ. આર. રાવ",
                  lines=["રાષ્ટ્રીય સમુદ્રવિજ્ઞાન સંસ્થા, ગોવા", "દરિયામાં શોધ: ૧૯૮૩ થી"], accent=RED, rot=1.0,
                  title_size=170, body_size=105))
    a21 = pr("A21", COLS[1], y4 - 100, L(15) + 0.05, rot=1.3)
    film.add(Card(COLS[1], y4 + 2900, 2700, 1250, W(15, "પથ્થરની") - 0.2, title="પથ્થરનાં લંગર",
                  lines=["દીવાલો, બુરજ, થાંભલા", "ત્રિકોણ અને લંબચોરસ લંગર"], accent=RED, rot=-1.0,
                  title_size=170, body_size=105))
    film.add(BigText("આશરે ૩૫૦૦ વર્ષ", COLS[2] + 300, y4 - 300, 360, W(16, "સાડા") - 0.1, bar=HILITE, bar_h=0.92,
                     rgb=DARK, shadow=False, hit=0.6, t_out=L(22)))
    film.add(BigText("ડૉ. રાવનો અંદાજ", COLS[2] + 300, y4 + 300, 170, W(16, "સાડા") + 0.3, rgb=(236, 230, 220), grunge=False, t_out=L(22)))
    film.add(PenMark("strike", COLS[2] + 300, y4 - 450, 3400, 0, t_in=W(26, "પાછળના") - 0.2, dur=0.4, width=34, seed=9, rgb=RED, t_out=L(22)))
    film.add(Stamp("વિવાદ", COLS[2] + 300, y4 + 1200, size=380, rot=7, t_in=W(26, "હોઈ") - 0.05, t_out=L(22)))
    film.add(XMarker(*bet, None, t_in=W(17, "બેટ") - 0.1, side="right", **LBL))
    film.add(Card(-2600, 3900, 4600, 2000, W(17, "બેટ") - 0.1, title="બેટ દ્વારકા",
                  lines=["જૂનાં વાસણો", "સિંધુ શૈલીની મુદ્રા"], accent=RED, rot=1.0, title_size=330, body_size=200))
    film.add(StringLine(bet, (-3900, 3000), t_in=W(17, "બેટ"), dur=0.6, sag=0.04, width=14))

    shot(L(13) + 0.3, COLS[1], y4 - 3100, 0.5, 0.0)
    shot(E(13), COLS[1], y4 - 3000, 0.52, 0.2)
    shot(L(14) + 0.5, COLS[0], y4 + 600, 0.47, -0.4)
    shot(W(14, "રાવની") + 0.4, COLS[0], y4 + 2300, 0.62, 0.0)
    shot(L(15) + 0.5, COLS[1], y4 + 500, 0.47, 0.4)
    shot(W(15, "પથ્થરની") + 0.3, COLS[1], y4 + 2300, 0.62, 0.2)
    shot(W(16, "સાડા") + 0.3, COLS[2] + 300, y4, 0.72, -0.4)
    shot(E(16), COLS[2] + 300, y4 + 100, 0.74, -0.2)
    shot(W(26, "પાછળના"), COLS[2] + 300, y4 + 400, 0.66, 0.4)
    shot(E(26) + 0.1, COLS[2] + 300, y4 + 500, 0.52, 0.6)
    shot(W(17, "બેટ") + 0.3, -4300, 2300.0, 0.36, 0.0, radius=5000, strength=0.3)   # back on the map
    shot(E(17) + 0.2, -3900, 2700, 0.4, 0.0, radius=4000, strength=0.35)

    # ============================================================ WHY (18-21)   y ~ 18500
    y5 = 18500
    a10 = pr("A10", COLS[0], y5, L(18) + 0.05, rot=-1.1)
    film.add(BigText("૩ કારણ", COLS[1] + 2000, y5 - 2700, 420, W(18, "ત્રણ") - 0.1, bar=HILITE, bar_h=0.92, rgb=DARK, shadow=False, hit=0.6))
    cards = []
    for k, (line, word, title, sub) in enumerate((
            (19, "પહેલું", "૧ · દરિયાની સપાટી", ["દરિયો ચડતો-ઊતરતો રહ્યો"]),
            (20, "બીજું", "૨ · ધરતીકંપ", ["કચ્છ–સૌરાષ્ટ્ર પટ્ટો", "૧૮૧૯ · ૨૦૦૧"]),
            (21, "ત્રીજું", "૩ · ધોવાણ", ["મોજાં કિનારો કોતરે"]))):
        x = COLS[1] + k * 3200 - 200
        cards.append((x, y5))
        film.add(Card(x, y5 - 300 + 500 * (k % 2), 2900, 1400, W(line, word) - 0.1, title=title, lines=sub,
                      accent=RED, rot=(-1.2, 0.9, -0.6)[k], title_size=230, body_size=175))

    shot(L(18) + 0.4, COLS[0] + 3000, y5 - 1200, 0.42, 0.0)
    shot(L(18) + 1.2, COLS[0] + 2900, y5 - 1100, 0.43, 0.1)
    shot(E(18), COLS[0] + 3200, y5 - 1000, 0.44, 0.2)
    for k, (line, word) in enumerate(((19, "પહેલું"), (20, "બીજું"), (21, "ત્રીજું"))):
        x, y = cards[k]
        shot(W(line, word) + 0.3, x, y + 500 * (k % 2) - 300, 0.78, (-0.6, 0.4, -0.3)[k])
        shot(E(line) - 0.1, x, y + 500 * (k % 2) - 200, 0.82, (-0.4, 0.6, -0.1)[k])

    # ============================================================ CLOSE (22-25)
    for k, (x, y) in enumerate(cards):
        film.add(StringLine((x, y - 300 + 500 * (k % 2) - 800), dw, t_in=L(22) + 0.2 + 0.35 * k, dur=1.1, sag=0.02, width=20, persist=True))
    a12 = pr("A12", -11800, 9800, L(23) + 0.05, rot=1.2, w=2700)
    film.add(BigText("દરિયો જીત્યો", -11800, 12750, 420, W(23, "દરિયો") - 0.05, rgb=(244, 240, 232), hit=0.9))
    a24 = pr("A24", -11900, 3300, L(24) + 0.05, rot=-1.0, w=2600)
    film.add(StringLine(top(a24), dw, t_in=L(24) + 0.4, dur=0.6, sag=0.04, width=16, persist=True))
    film.add(BigText("જય દ્વારકાધીશ", -11900, 6600, 560, L(25) + 0.05, rgb=(244, 240, 232), hit=0.8))

    shot(L(22) + 0.6, -11000, 9000, 0.17, 0.0, radius=14000, strength=0.2)     # three strings run up to Dwarka
    shot(E(22), -10500, 6000, 0.16, 0.0, radius=14000, strength=0.2)
    shot(L(23) + 0.5, -11800, 10500, 0.47, 0.4)
    shot(W(23, "દરિયો") + 0.3, -11800, 11400.0, 0.5, 0.0)
    shot(L(24) + 0.5, -11900, 3300, 0.48, -0.4)
    shot(E(24) - 0.2, -11900, 3700, 0.5, -0.2)
    shot(L(25) + 0.3, -11900, 5000, 0.42, 0.0)
    shot(E(25) + 0.3, -11900, 5300, 0.4, 0.0)
    cam(film.duration, -8000, 4500, 0.075, 0.0)                                   # the whole wall
    foc(film.duration, -8000, 4500, 30000, 0.05)

    film.fade_in, film.fade_out = 0.9, 2.2
    return film
