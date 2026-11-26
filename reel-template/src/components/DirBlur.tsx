import React from 'react';

/** Directional (motion) blur. x = horizontal px, y = vertical px. Wraps any content. */
export const DirBlur: React.FC<{id: string; x?: number; y?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({
  id,
  x = 0,
  y = 0,
  style,
  children,
}) => {
  const on = x > 0.3 || y > 0.3;
  return (
    <>
      {on && (
        <svg width={0} height={0} style={{position: 'absolute'}}>
          <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={`${x} ${y}`} />
          </filter>
        </svg>
      )}
      <div style={{...style, filter: on ? `url(#${id})` : undefined}}>{children}</div>
    </>
  );
};
