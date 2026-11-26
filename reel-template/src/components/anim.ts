import {Easing, interpolate} from 'remotion';

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const easeOut = Easing.out(Easing.cubic);
export const easeIn = Easing.in(Easing.cubic);

/**
 * The reference reel's signature text motion.
 * IN : starts stretched 2.4x tall with strong VERTICAL motion blur, snaps to size (looks like slats/bars).
 * OUT: drifts upward, blurs vertically and fades.
 */
export function stretchInDriftOut(frame: number, inF: number, outF: number, enter = 8, exit = 8) {
  const p = easeOut(clamp01((frame - inF) / enter));
  const q = easeIn(clamp01((frame - (outF - exit)) / exit));
  return {
    visible: frame >= inF && frame < outF,
    scaleY: interpolate(p, [0, 1], [2.4, 1]),
    scaleX: interpolate(p, [0, 1], [0.92, 1]),
    blurY: (1 - p) * 26 + q * 22,
    translateY: (1 - p) * 30 - q * 90,
    opacity: Math.min(1, p * 2.2) * (1 - q),
  };
}
