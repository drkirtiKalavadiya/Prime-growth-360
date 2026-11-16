#!/usr/bin/env python3
"""Rang Reels: python3 reel.py PLAN.json prep | stills [T ...] | render [--force]"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rangreels.cli import main
sys.exit(main(sys.argv[1:]))
