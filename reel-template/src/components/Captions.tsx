import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {CAPTION, COLORS, FONT, sizeFor, spacingFor} from '../style';

export type Caption = {t: number; w: string; end?: number};

/** One word at a time, white Poppins ExtraBold at chest height, small spring pop on every word. */
export const Captions: React.FC<{items: Caption[]}> = ({items}) => {
  const frame = useCurrentFrame();
  const {fps, height} = useVideoConfig();
  const now = frame / fps;
  let idx = -1;
  for (let i = 0; i < items.length; i++) if (items[i].t <= now) idx = i;
  if (idx < 0) return null;
  const c = items[idx];
  const next = items[idx + 1];
  const end = c.end ?? (next && next.t - c.t < 1.0 ? next.t : c.t + 0.8);
  if (now >= end) return null;
  const s = spring({frame: frame - Math.round(c.t * fps), fps, config: {damping: 13, stiffness: 260}, durationInFrames: CAPTION.popFrames + 4});
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: CAPTION.y * height,
        textAlign: 'center',
        fontFamily: FONT,
        fontWeight: CAPTION.weight,
        fontSize: sizeFor(c.w, CAPTION.size),
        letterSpacing: spacingFor(c.w, CAPTION.letterSpacing),
        color: COLORS.white,
        textShadow: CAPTION.shadow,
        transform: `translateY(-50%) scale(${0.82 + 0.18 * s})`,
      }}
    >
      {c.w}
    </div>
  );
};
