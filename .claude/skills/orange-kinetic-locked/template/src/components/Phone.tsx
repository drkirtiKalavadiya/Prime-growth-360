import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT} from '../style';
import {clamp01, easeIn, easeOut} from './anim';
import {DirBlur} from './DirBlur';

export type PhoneCfg = {start: number; end: number; text: string; size: number; yFrom: number; yTo: number; moveAt: number};

/** Orange CTA (phone number / handle) with a white light-sweep through the letters, slides up, then flies out the top. */
export const Phone: React.FC<{cfg: PhoneCfg}> = ({cfg}) => {
  const frame = useCurrentFrame();
  const {fps, height} = useVideoConfig();
  const f0 = Math.round(cfg.start * fps);
  const fE = Math.round(cfg.end * fps);
  const fM = Math.round(cfg.moveAt * fps);
  if (frame < f0 || frame >= fE) return null;

  const pin = easeOut(clamp01((frame - f0) / 8));
  const move = easeOut(clamp01((frame - fM) / 10));
  const out = easeIn(clamp01((frame - (fE - 8)) / 8));
  const y = interpolate(move, [0, 1], [cfg.yFrom, cfg.yTo]) * height - out * height * 0.5;
  // light sweep passes through the text twice
  const sweep = interpolate((frame - f0) % 45, [0, 45], [120, -20]);

  return (
    <DirBlur
      id="phone-blur"
      y={(1 - pin) * 22 + out * 30}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: y,
        textAlign: 'center',
        transform: `translateY(-50%) scaleY(${interpolate(pin, [0, 1], [2.2, 1])})`,
        opacity: Math.min(1, pin * 2) * (1 - out),
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.35))',
      }}
    >
      <span
        style={{
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: cfg.size,
          letterSpacing: '-0.02em',
          backgroundImage: `linear-gradient(100deg, ${COLORS.orange} 0%, ${COLORS.orange} 38%, #fff 50%, ${COLORS.orange} 62%, ${COLORS.orange} 100%)`,
          backgroundSize: '300% 100%',
          backgroundPosition: `${sweep}% 0`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {cfg.text}
      </span>
    </DirBlur>
  );
};
