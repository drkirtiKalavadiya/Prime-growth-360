#!/usr/bin/env python3
"""Halo Reels setup check: says in plain words what is missing and how to install it. usage: python3 setup_check.py"""
import importlib, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ok = True


def line(good, what, fix=''):
    global ok
    ok &= good
    print(('  OK   ' if good else '  MISSING  ') + what + ('' if good or not fix else f'\n         -> {fix}'))


print('Halo Reels setup check\n')
line(sys.version_info >= (3, 9), f'Python {sys.version.split()[0]} (3.9 or newer)', 'install Python 3.11 from python.org')
for mod, pipname in [('numpy', 'numpy'), ('cv2', 'opencv-contrib-python-headless'), ('mediapipe', 'mediapipe')]:
    try:
        importlib.import_module(mod); line(True, f'python package {pipname}')
    except Exception:
        line(False, f'python package {pipname}', f'{sys.executable} -m pip install {pipname}')
try:
    import cv2
    line(hasattr(cv2, 'ximgproc'), 'OpenCV contrib (clean hair edges)', f'{sys.executable} -m pip install opencv-contrib-python-headless')
except Exception:
    pass
try:
    importlib.import_module('faster_whisper'); line(True, 'faster-whisper (automatic word timings)')
except Exception:
    print('  OPTIONAL  faster-whisper (automatic word timings)\n         -> ' + f'{sys.executable} -m pip install faster-whisper')
for tool in ('ffmpeg', 'ffprobe'):
    line(shutil.which(tool) is not None, tool, 'macOS: brew install ffmpeg · Windows: winget install ffmpeg · Linux: apt-get install ffmpeg')
node = shutil.which('node')
ver = subprocess.run(['node', '-v'], capture_output=True, text=True).stdout.strip() if node else ''
line(bool(node) and int(ver.lstrip('v').split('.')[0] or 0) >= 18, f'Node.js {ver or ""} (18 or newer)', 'install Node.js LTS from nodejs.org')
line(os.path.isdir(os.path.join(HERE, 'node_modules', '@fontsource')), 'fonts (npm install)', f'cd "{HERE}" && npm install')
pw = subprocess.run(['node', '-e', "require('playwright'); console.log('ok')"], capture_output=True, text=True, cwd=HERE) if node else None
line(bool(pw) and pw.returncode == 0, 'Playwright (renders the graphics)', f'cd "{HERE}" && npm install playwright && npx playwright install chromium')
if sys.platform.startswith('linux'):
    have_egl = any(os.path.exists(p) for p in ('/usr/lib/x86_64-linux-gnu/libEGL.so.1', '/usr/lib/aarch64-linux-gnu/libEGL.so.1', '/usr/lib/libEGL.so.1'))
    line(have_egl, 'libEGL (needed by the person cut-out on Linux)', 'sudo apt-get install -y libegl1 libgles2')
print('\nAll set. Send Claude your clip.' if ok else '\nInstall the missing pieces above, then run this check again.')
sys.exit(0 if ok else 1)
