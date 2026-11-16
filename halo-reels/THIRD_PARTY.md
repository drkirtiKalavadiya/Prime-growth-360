# Third-party components

| Component | Use | License | How it arrives |
|---|---|---|---|
| Fraunces (Undercase Type) | accent serif | SIL OFL 1.1 | npm `@fontsource-variable/fraunces` |
| Instrument Serif (Instrument) | italic accent | SIL OFL 1.1 | npm `@fontsource/instrument-serif` |
| Manrope (Mikhail Sharanda) | text | SIL OFL 1.1 | npm `@fontsource-variable/manrope` |
| MediaPipe selfie multiclass segmenter | person cut-out | Apache-2.0 | pip `mediapipe`; model downloaded once from storage.googleapis.com |
| OpenCV (contrib) | image processing, guided filter | Apache-2.0 | pip |
| NumPy | maths | BSD-3 | pip |
| Playwright + Chromium | renders the graphics | Apache-2.0 / BSD | npm |
| FFmpeg | video and audio | LGPL/GPL (installed by the user, not bundled) | system |
| faster-whisper (optional) | word timings | MIT | pip |

No sound effect, image or font file is bundled from a third party: all sound effects are synthesised by
`halo/sfx.py`, all graphics are drawn in code.
