"""
Prove nothing but the person (and timing) changed.

  python3 verify_lock.py            # check
  python3 verify_lock.py --write    # (maintainer only) re-seal after an intentional style update

Checks:
 1. sha256 of every locked file (style, components, sfx, music, master edit) matches LOCK.sha256
 2. template/src/edit.json equals the master edit after removing time values, duration, video/subject
Exit code 1 if anything differs.
"""
import hashlib, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
LOCKFILE = os.path.join(ROOT, "locked", "LOCK.sha256")
LOCKED_PATHS = ["locked/master_edit.json", "locked/master_script.json", "template/src/style.ts",
                "template/src/Reel.tsx", "template/src/Root.tsx", "template/src/components", "template/public/sfx",
                "template/remotion.config.ts"]
TIME_KEYS = {"t", "start", "end", "in", "out", "moveAt", "strikeAt", "bwAt"}
FREE_KEYS = {"durationSec", "video", "subject", "whips"}


def files():
    for p in LOCKED_PATHS:
        full = os.path.join(ROOT, p)
        if os.path.isdir(full):
            for f in sorted(os.listdir(full)):
                yield os.path.join(p, f)
        else:
            yield p


def sha(p):
    return hashlib.sha256(open(os.path.join(ROOT, p), "rb").read()).hexdigest()


def strip(o):
    if isinstance(o, dict):
        return {k: strip(v) for k, v in o.items() if k not in TIME_KEYS and k not in FREE_KEYS}
    if isinstance(o, list):
        return [strip(v) for v in o]
    return o


if "--write" in sys.argv:
    with open(LOCKFILE, "w") as fh:
        for p in files():
            fh.write(f"{sha(p)}  {p}\n")
    print("sealed", LOCKFILE)
    sys.exit(0)

bad = []
want = dict(reversed(l.strip().split("  ", 1)) for l in open(LOCKFILE) if l.strip())
have = {p: sha(p) for p in files()}
for p in sorted(set(want) | set(have)):
    if want.get(p) != have.get(p):
        bad.append(f"locked file changed/missing: {p}")

edit = os.path.join(ROOT, "template", "src", "edit.json")
master = json.load(open(os.path.join(ROOT, "locked", "master_edit.json")))
if os.path.exists(edit) and strip(json.load(open(edit))) != strip(master):
    bad.append("edit.json differs from the locked master in something other than timing")

if bad:
    print("LOCK BROKEN:\n  " + "\n  ".join(bad))
    sys.exit(1)
print(f"LOCK OK: {len(have)} locked files unchanged; edit.json differs from master only in timing")
