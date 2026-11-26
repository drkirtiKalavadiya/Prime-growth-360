"""
Re-time the LOCKED master edit onto a new recording of the same script.

Nothing visual or audio is changed: every text string, colour, size, position, animation,
sound effect and volume is copied from locked/master_edit.json. Only the time values move,
so each locked event lands on the same spoken word in the new video.

  python3 retime.py --words new_words.json --duration 37.2 --out template/src/edit.json
  python3 retime.py --exact --duration 35.6 --out template/src/edit.json   # user lip-synced to the original timing

new_words.json = [{"t": 0.12, "w": "Last"}, ...]  (from transcribe_words.py)
"""
import argparse, bisect, difflib, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
LOCKED = os.path.join(HERE, "..", "locked")

NUM = {"60": "sixty", "4": "four", "6": "six", "1": "one"}


def norm(w):
    w = re.sub(r"[^a-z0-9']", "", w.lower().replace("’", "'"))
    return NUM.get(w, w)


def build_warp(master_words, new_words, m_dur, n_dur):
    a = [norm(w["w"]) for w in master_words]
    b = [norm(w["w"]) for w in new_words]
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    pairs = []
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            pairs.append((master_words[blk.a + k]["t"], new_words[blk.b + k]["t"]))
    pairs.sort()
    if not pairs or pairs[0][0] > 0.05:  # before the first matched word: keep the same offset
        x0, y0 = pairs[0] if pairs else (0.0, 0.0)
        pairs.insert(0, (0.0, max(0.0, y0 - x0)))
    # after the last matched word: keep the same offset (clipped to new duration)
    xl, yl = pairs[-1]
    pairs.append((max(m_dur, xl + 0.01), max(yl + 0.01, min(n_dur, yl + (m_dur - xl)))))
    # keep strictly increasing in both axes
    pairs.sort()
    clean = [pairs[0]]
    for x, y in pairs[1:]:
        if x > clean[-1][0] + 1e-3 and y > clean[-1][1] + 1e-3:
            clean.append((x, y))
    matched = len(clean) - 1
    xs, ys = zip(*clean)

    def warp(t):
        if t <= xs[0]:
            return ys[0]
        if t >= xs[-1]:
            return ys[-1] + (t - xs[-1])
        i = bisect.bisect_right(xs, t) - 1
        x0, x1, y0, y1 = xs[i], xs[i + 1], ys[i], ys[i + 1]
        return y0 + (t - x0) * (y1 - y0) / (x1 - x0)

    return warp, matched, len(a)


TIME_KEYS = {"t", "start", "end", "in", "out", "moveAt", "strikeAt", "bwAt"}


def apply(obj, warp):
    """Change ONLY time keys; every other value is copied untouched."""
    if isinstance(obj, dict):
        return {k: (round(warp(v), 3) if k in TIME_KEYS and isinstance(v, (int, float)) else apply(v, warp))
                for k, v in obj.items()}
    if isinstance(obj, list):
        return [apply(v, warp) for v in obj]
    return obj


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--words", help="new recording word timings json")
    ap.add_argument("--duration", type=float, required=True, help="new video duration in seconds")
    ap.add_argument("--exact", action="store_true", help="keep original timings (scaled to duration)")
    ap.add_argument("--out", required=True)
    ap.add_argument("--no-subject", action="store_true", help="no cut-out available: all text in front")
    a = ap.parse_args()

    master = json.load(open(os.path.join(LOCKED, "master_edit.json")))
    script = json.load(open(os.path.join(LOCKED, "master_script.json")))
    m_dur = script["durationSec"]

    if a.exact or not a.words:
        s = a.duration / m_dur
        warp = lambda t: t * s
        matched, total = -1, len(script["words"])
    else:
        new = json.load(open(a.words))
        warp, matched, total = build_warp(script["words"], new, m_dur, a.duration)

    out = apply(master, warp)
    out["whips"] = [round(warp(t), 3) for t in master["whips"]]
    out["durationSec"] = round(a.duration, 2)
    out["video"] = "input.mp4"
    out["subject"] = "" if a.no_subject else "subject.webm"
    json.dump(out, open(a.out, "w"), indent=1)

    if matched >= 0:
        pct = 100 * matched / total
        print(f"matched {matched}/{total} script words ({pct:.0f}%)")
        if pct < 60:
            print("WARNING: the recording does not follow the locked script closely; timings may drift. "
                  "Ask the user to record the script in references/script.md.")
    else:
        print("exact mode: original timings scaled to the new duration")
    print("wrote", a.out)


if __name__ == "__main__":
    main()
