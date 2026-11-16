"""Plan loading and word references.

Times in a plan are reel seconds (0 = the plan's `start` in the clip), or word references taken from words.json:
  "@growth"        start of the first occurrence of the word
  "@growth#2"      its second occurrence
  "@growth.e"      its end
  "@growth+0.15"   with an offset (also -0.1)
Punctuation and letter case are ignored.
"""
import json, os, re, unicodedata

REF = re.compile(r'^@(?P<word>.+?)(?:#(?P<n>\d+))?(?P<end>\.e)?(?P<off>[+-]\d+(?:\.\d+)?)?$')


def norm(w):
    w = unicodedata.normalize('NFC', str(w)).lower()
    return ''.join(ch for ch in w if not unicodedata.category(ch).startswith('P') and ch not in '।॥').strip()


def load(path):
    path = os.path.abspath(path)
    with open(path, encoding='utf-8') as f:
        plan = json.load(f)
    plan['_path'] = path
    plan['_dir'] = os.path.dirname(path)
    plan['_work'] = os.path.splitext(path)[0] + '_work'
    return plan


def asset(plan, p):
    return p if os.path.isabs(p) else os.path.join(plan['_dir'], p)


def resolve(plan, words):
    """Replace every '@word' string in the plan with a number of seconds. Raises with the list of known words if one is missing."""
    index = {}
    for w in words or []:
        index.setdefault(norm(w['w']), []).append(w)

    def one(s):
        m = REF.match(s)
        if not m:
            raise ValueError(f'bad time reference {s!r}')
        key = norm(m['word'])
        hits = index.get(key)
        n = int(m['n'] or 1)
        if not hits or len(hits) < n:
            known = ' '.join(sorted(index))[:600]
            raise ValueError(f'word {m["word"]!r} (occurrence {n}) is not in words.json. Words: {known}')
        w = hits[n - 1]
        t = (w['e'] if m['end'] else w['s']) + float(m['off'] or 0)
        return round(t - float(plan.get('start', 0) or 0), 3)

    def walk(v):
        if isinstance(v, str) and v.startswith('@'):
            return one(v)
        if isinstance(v, list):
            return [walk(x) for x in v]
        if isinstance(v, dict):
            return {k: (walk(x) if not k.startswith('_') else x) for k, x in v.items()}
        return v

    out = walk({k: v for k, v in plan.items()})
    check(out)
    return out


def check(plan):
    """The rules every reel keeps (see SKILL.md)."""
    segs = plan.get('segments') or []
    if not segs:
        raise ValueError('plan has no segments')
    for a, b in zip(segs, segs[1:]):
        if abs(a['to'] - b['from']) > 1e-3:
            raise ValueError(f'segments must touch: {a["to"]} != {b["from"]}')
    total = segs[-1]['to'] - segs[0]['from']
    if total > float(plan.get('max_length', 15)) + 1e-6:
        raise ValueError(f'reel is {total:.1f} s; keep it at {plan.get("max_length", 15)} s or less')
    for s in segs:
        if s.get('kind') not in ('speaker', 'abstract'):
            raise ValueError(f'segment kind must be speaker or abstract, got {s.get("kind")!r}')
        for e in s.get('elements', []):
            if e.get('el') in ('caption', 'headword') and isinstance(e.get('accent'), list) and len(e['accent']) != 2:
                raise ValueError('accent is ["word", time]: one accent word per block')
            if s['kind'] == 'abstract' and e.get('el') in ('headword', 'card'):
                raise ValueError(f'{e["el"]} needs a speaker; abstract scenes take caption, panels, chips, badge, counter, notify')
