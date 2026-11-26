import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../style';
import {clamp01, easeOut} from './anim';

export type HouseStrikeCfg = {start: number; strikeAt: number; bwAt: number; end: number; y: number};

/**
 * Orange gradient house outline draws itself on, a white diagonal bar slashes through it,
 * then (bwAt) the icon washes to white while the background goes black & white.
 * Sits BEHIND the speaker.
 */
export const HouseStrike: React.FC<{cfg: HouseStrikeCfg}> = ({cfg}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const f0 = Math.round(cfg.start * fps);
  const fS = Math.round(cfg.strikeAt * fps);
  const fB = Math.round(cfg.bwAt * fps);
  const fE = Math.round(cfg.end * fps);
  if (frame < f0 || frame >= fE) return null;

  const draw = easeOut(clamp01((frame - f0) / 18));
  const pop = interpolate(frame - f0, [0, 6, 12], [0.85, 1.04, 1], {extrapolateRight: 'clamp'});
  const strike = easeOut(clamp01((frame - fS) / 6));
  const wash = clamp01((frame - fB) / 10); // 0 = orange, 1 = white/ghost
  const size = width * 0.66;
  const cy = cfg.y * height;

  return (
    <>
      <svg
        viewBox="0 0 400 400"
        width={size}
        height={size}
        style={{position: 'absolute', left: (width - size) / 2, top: cy - size / 2, transform: `scale(${pop})`, overflow: 'visible'}}
      >
        <defs>
          <linearGradient id="houseGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={COLORS.orangeLight} />
            <stop offset="1" stopColor={COLORS.orange} />
          </linearGradient>
        </defs>
        {/* open-door house outline: gap at bottom left like the reference */}
        <path
          d="M 150 345 L 70 345 L 70 170 L 200 60 L 330 170 L 330 345 L 230 345"
          fill="none"
          stroke="url(#houseGrad)"
          strokeWidth={34}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - draw}
          opacity={1 - wash * 0.6}
        />
        <path
          d="M 150 345 L 70 345 L 70 170 L 200 60 L 330 170 L 330 345 L 230 345"
          fill="none"
          stroke="#fff"
          strokeWidth={34}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={wash * 0.75}
        />
      </svg>
      {strike > 0 && (
        <div
          style={{
            position: 'absolute',
            left: -width * 0.1,
            top: cy + size * 0.05,
            width: width * 1.25,
            height: 46,
            borderRadius: 23,
            background: COLORS.white,
            boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
            transformOrigin: '0% 50%',
            transform: `rotate(28deg) translateY(-${size * 0.35}px) scaleX(${strike})`,
          }}
        />
      )}
    </>
  );
};

/** 0..1 amount of black & white to apply to the background footage. */
export const bwAmount = (frame: number, fps: number, cfg?: HouseStrikeCfg) => {
  if (!cfg) return 0;
  const fB = Math.round(cfg.bwAt * fps);
  const fE = Math.round(cfg.end * fps);
  if (frame < fB || frame >= fE) return 0;
  return clamp01((frame - fB) / 8);
};
