"""દ્વારકા કેમ ડૂબી ગઈ? — about 2:17, cork evidence wall, pictures only (no on-screen text).

One wall: the India map on the right, five rows of prints out on the cork to its west (off the map
sheet, which ends at x = -9300), and a short close column beside Dwarka. Red string ties the story
back to Dwarka. Times still come from the narration timing (doc.L / doc.E / doc.W), so the pictures
change where the script's lines change, even though the film plays with music and effects only.
"""
from engine import Film, GeoMap, Print, Route, StringLine, XMarker

K = 60000
COLS = (-24800, -21500, -18200, -14900)   # four print columns on the cork
ROWS = (-8000, -1500, 5000, 11500, 18000)
CLOSE_X = -11300                          # the close column, between the cork rows and the map
PW = 2500
MK = dict(size=5.0, label_size=420)


def build_film(doc):
    L, E, W = doc.L, doc.E, doc.W
    film = Film(doc.duration, fps=30, look="wall")
    shot, cue = film.shot, film.cue

    m = film.add(GeoMap(doc.map("india"), K, look="explainer"))
    dw, bet, mth = m.place("Dwarka"), m.place("Bet Dwarka"), m.place("Mathura")

    def pr(key, x, y, t, rot=0.0, w=PW):
        return film.add(Print(key, x, y, w, rot=rot, t_in=t))

    def top(p):
        return doc.on(p, 0.5, 0.03)

    def hero(line, x, y, z0=0.44, z1=0.5, r0=-0.5, r1=0.3, t0=None, t1=None):
        """Land on a print just after its line starts, then push in slowly until the line ends."""
        shot((L(line) + 0.45) if t0 is None else t0, x, y + 150, z0, r0)
        shot((E(line) - 0.05) if t1 is None else t1, x, y + 50, z1, r1)

    # ============================================================ ROW 1: cold open (1-3)
    y = ROWS[0]
    pr("A18", COLS[0], y, L(1) + 0.1, rot=-1.5)
    a01 = pr("A01", COLS[1], y + 100, L(2) + 0.1, rot=1.4)
    film.add(StringLine(top(a01), dw, t_in=W(2, "દ્વારકાના") - 0.2, dur=1.0, sag=0.03, width=18, persist=True))
    film.add(XMarker(*dw, None, t_in=W(2, "દ્વારકાના") + 0.6, side="left", **MK))
    pr("A12", COLS[2], y - 100, L(3) + 0.05, rot=-1.0)
    cue("boom", W(3, "કેમ"), 0.55)

    shot(0.0, COLS[0], y + 300, 0.42, -0.8)
    shot(E(1) - 0.1, COLS[0], y + 100, 0.5, 0.0)
    shot(L(2) + 0.5, COLS[1], y + 200, 0.46, 0.6)
    shot(W(2, "દ્વારકાના") + 0.3, -13500, y + 4300, 0.17, 0.0, strength=0.25)   # the string runs to Dwarka
    shot(E(2) + 0.1, -13200, y + 4500, 0.165, 0.0, strength=0.2)
    hero(3, COLS[2], y - 100, 0.42, 0.52, -0.3, 0.2, t1=E(3) + 0.9)

    # ============================================================ ROW 2: the legend (4-7)
    y = ROWS[1]
    pr("A14", COLS[0], y, L(4) + 0.05, rot=-1.0)
    film.add(XMarker(*mth, None, t_in=W(5, "મથુરા") - 0.1, side="right", **MK))
    film.add(Route(mth, dw, t_in=W(5, "છોડીને"), dur=2.2, bend=-0.2, width=70))
    a13 = pr("A13", COLS[1], y, L(6) + 0.05, rot=1.2)
    film.add(StringLine(top(a13), dw, t_in=L(6) + 0.3, dur=0.8, sag=0.03, width=16))
    pr("A02", COLS[2], y - 100, L(7) + 0.05, rot=-1.3)

    hero(4, COLS[0], y)
    shot(W(5, "છોડીને") + 0.2, -2600, -2200, 0.21, 0.0, radius=9000, strength=0.2)  # the map: Mathura to Dwarka
    shot(E(5) - 0.3, -4800, -1000, 0.24, 0.0, radius=8000, strength=0.2)
    hero(6, COLS[1], y, r0=0.4, r1=-0.2)
    hero(7, COLS[2], y - 100)

    # ============================================================ ROW 3: the fall (9-12)
    y = ROWS[2]
    cue("riser", L(9) - 1.2, 0.45, dur=1.1)
    pr("A03", COLS[0], y, L(9) + 0.05, rot=1.2)
    film.shake(W(10, "શ્રાપ"), 18, 0.4)
    cue("impact", W(10, "શ્રાપ"), 0.6)
    pr("A16", COLS[1], y - 100, L(11) + 0.05, rot=-1.4)
    pr("A17", COLS[2], y, L(12) + 0.05, rot=1.0)
    film.shake(W(12, "ગળી"), 26, 0.6)
    cue("boom", W(12, "ગળી"), 0.5)

    shot(L(9) + 0.45, COLS[0], y + 150, 0.44, 0.4)
    shot(W(10, "શ્રાપ") + 0.2, COLS[0], y - 200, 0.68, -0.6)          # push in on the curse
    shot(E(10), COLS[0], y - 250, 0.72, -0.8)
    hero(11, COLS[1], y - 100, r0=0.6, r1=0.2)
    hero(12, COLS[2], y, t1=E(12) + 0.4)

    # ============================================================ ROW 4: the search (13-16, 26)
    y = ROWS[3]
    pr("A06", COLS[0], y, L(13) + 0.05, rot=-1.1)
    pr("A22", COLS[1], y - 100, L(14) + 0.05, rot=1.2)
    pr("A21", COLS[2], y, L(15) + 0.05, rot=-1.3)
    pr("A04", COLS[3], y + 100, L(16) + 0.05, rot=1.1)
    cue("impact", W(16, "સાડા"), 0.4)

    hero(13, COLS[0], y)
    hero(14, COLS[1], y - 100, r0=0.4, r1=0.0)
    hero(15, COLS[2], y)
    shot(L(16) + 0.45, COLS[3], y + 250, 0.44, 0.3)
    shot(E(16), COLS[3], y + 150, 0.5, 0.0)
    shot(W(26, "પાછળના"), COLS[3], y + 100, 0.56, -0.4)
    shot(E(26) + 0.1, COLS[3], y + 50, 0.6, -0.6)

    # ============================================================ the map again: Bet Dwarka (17)
    film.add(XMarker(*bet, None, t_in=W(17, "બેટ") - 0.1, side="right", **MK))
    shot(W(17, "બેટ") + 0.3, -5600, 1200, 0.42, 0.0, radius=4000, strength=0.3)
    shot(E(17) + 0.2, -5900, 1000, 0.5, 0.0, radius=3500, strength=0.35)

    # ============================================================ ROW 5: why (18-21)
    y = ROWS[4]
    pr("A10", COLS[0], y, L(18) + 0.05, rot=-1.1)
    reasons = [pr(k, COLS[c], y + (100 if c % 2 else -100), W(line, word) - 0.1, rot=r)
               for k, c, line, word, r in (("A05", 1, 19, "પહેલું", 1.3), ("A15", 2, 20, "બીજું", -1.2), ("A09", 3, 21, "ત્રીજું", 1.0))]
    film.shake(W(20, "ધરતીકંપ"), 30, 0.7)
    cue("boom", W(20, "ધરતીકંપ"), 0.45)

    shot(L(18) + 0.4, COLS[0] + 400, y - 300, 0.3, 0.0, radius=6000, strength=0.3)
    shot(E(18) - 0.1, COLS[0], y + 100, 0.46, 0.2)
    for c, (line, word) in zip((1, 2, 3), ((19, "પહેલું"), (20, "બીજું"), (21, "ત્રીજું"))):
        hero(line, COLS[c], y + (100 if c % 2 else -100), t0=W(line, word) + 0.3)

    # ============================================================ CLOSE (22-25)
    for k, p in enumerate(reasons):
        film.add(StringLine(top(p), dw, t_in=L(22) + 0.2 + 0.35 * k, dur=1.1, sag=0.02, width=22, persist=True))
    a24 = pr("A24", CLOSE_X, 2600, L(24) + 0.05, rot=-1.0, w=2600)
    film.add(StringLine(top(a24), dw, t_in=L(24) + 0.4, dur=0.6, sag=0.04, width=16, persist=True))
    pr("A11", CLOSE_X, 9200, L(25) - 0.2, rot=1.2, w=2600)

    shot(L(22) + 0.6, -13500, 10000, 0.15, 0.0, radius=15000, strength=0.2)    # three strings run to Dwarka
    shot(E(22), -13800, 2000, 0.14, 0.0, radius=15000, strength=0.2)
    hero(23, COLS[2], ROWS[0] - 100, 0.4, 0.5, 0.2, -0.3)                       # back to the opening picture: the sea won
    hero(24, CLOSE_X, 2600, r0=-0.4, r1=0.0)
    shot(L(25) + 0.2, CLOSE_X, 9200, 0.46, 0.3)
    shot(E(25) + 1.2, CLOSE_X, 9000, 0.4, 0.0)
    film.cam(film.duration, -9500, 4500, 0.075, 0.0)                            # the whole wall
    film.focus(film.duration, -9500, 4500, 30000, 0.05)

    film.fade_in, film.fade_out = 0.9, 2.2
    return film
