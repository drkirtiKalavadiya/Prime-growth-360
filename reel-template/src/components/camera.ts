import {interpolate} from 'remotion';
import {clamp01, easeIn, easeOut} from './anim';

export type Zoom = {t: number; scale: number; cut?: boolean};

/** Punch zooms: each event eases to its scale in 5 frames and holds (cut=true jumps instantly). */
export function zoomAt(frame: number, fps: number, zooms: Zoom[]) {
  let scale = 1;
  for (const z of [...zooms].sort((a, b) => a.t - b.t)) {
    const f = Math.round(z.t * fps);
    if (frame < f) break;
    scale = z.cut ? z.scale : interpolate(easeOut(clamp01((frame - f) / 5)), [0, 1], [scale, z.scale]);
  }
  return scale;
}

/** Whip-pan transition: 6 frames accelerate left with horizontal blur, 9 frames settle in from the right. */
export function whipAt(frame: number, fps: number, whips: number[], width: number) {
  for (const t of whips) {
    const d = frame - Math.round(t * fps);
    if (d >= -6 && d < 0) {
      const p = easeIn((d + 6) / 6);
      return {x: -p * width * 0.12, blur: p * 50, scale: 1 + p * 0.22};
    }
    if (d >= 0 && d < 9) {
      const p = easeOut(d / 9);
      return {x: (1 - p) * width * 0.12, blur: (1 - p) * 50, scale: 1.22 - p * 0.22};
    }
  }
  return {x: 0, blur: 0, scale: 1};
}
