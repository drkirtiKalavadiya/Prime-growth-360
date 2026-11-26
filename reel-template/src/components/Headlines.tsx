import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT, HEADLINE} from '../style';
import {stretchInDriftOut} from './anim';
import {DirBlur} from './DirBlur';

export type HeadlineLine = {
  text: string;
  color: 'white' | 'orange';
  size: number;
  y: number;
  behind?: boolean;
  in?: number;
  out?: number;
};
export type Headline = {start: number; end: number; lines: HeadlineLine[]};

/** Big stacked kinetic words. Rendered twice: layer="behind" (under the cut-out speaker) and layer="front". */
export const Headlines: React.FC<{items: Headline[]; layer: 'behind' | 'front'; hasSubject: boolean}> = ({
  items,
  layer,
  hasSubject,
}) => {
  const frame = useCurrentFrame();
  const {fps, height} = useVideoConfig();
  return (
    <>
      {items.flatMap((h, hi) =>
        h.lines.map((l, li) => {
          const isBehind = Boolean(l.behind) && hasSubject;
          if ((layer === 'behind') !== isBehind) return null;
          const inF = Math.round((l.in ?? h.start) * fps) + (l.in === undefined ? li * HEADLINE.stagger : 0);
          const outF = Math.round((l.out ?? h.end) * fps);
          const a = stretchInDriftOut(frame, inF, outF, HEADLINE.enterFrames, HEADLINE.exitFrames);
          if (!a.visible) return null;
          return (
            <DirBlur
              key={`${hi}-${li}`}
              id={`hb-${hi}-${li}`}
              y={a.blurY}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: l.y * height,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                fontFamily: FONT,
                fontWeight: HEADLINE.weight,
                fontSize: l.size,
                lineHeight: HEADLINE.lineHeight,
                letterSpacing: HEADLINE.letterSpacing,
                color: COLORS[l.color],
                textShadow: '0 6px 26px rgba(0,0,0,0.22)',
                opacity: a.opacity,
                transform: `translateY(-50%) translateY(${a.translateY}px) scale(${a.scaleX}, ${a.scaleY})`,
              }}
            >
              {l.text}
            </DirBlur>
          );
        }),
      )}
    </>
  );
};
