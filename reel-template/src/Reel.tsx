import React from 'react';
import {AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import edit from './edit.json';
import {GRADE} from './style';
import {Captions, Caption} from './components/Captions';
import {Headlines, Headline} from './components/Headlines';
import {HouseStrike, HouseStrikeCfg, bwAmount} from './components/HouseStrike';
import {Phone, PhoneCfg} from './components/Phone';
import {whipAt, zoomAt, Zoom} from './components/camera';
import {DirBlur} from './components/DirBlur';

type Edit = {
  video: string;
  subject?: string;
  music?: {file: string; volume: number};
  captions: Caption[];
  headlines: Headline[];
  phone?: PhoneCfg;
  houseStrike?: HouseStrikeCfg;
  zooms: Zoom[];
  whips: number[];
  sfx: {t: number; file: string; vol: number}[];
};
const E = edit as unknown as Edit;

const fill: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover'};

export const Reel: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const hasSubject = Boolean(E.subject);

  const zoom = zoomAt(frame, fps, E.zooms);
  const whip = whipAt(frame, fps, E.whips, width);
  const bw = bwAmount(frame, fps, E.houseStrike);
  const cam: React.CSSProperties = {transform: `scale(${zoom})`, transformOrigin: '50% 42%'};

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <DirBlur
        id="whip"
        x={whip.blur}
        style={{position: 'absolute', inset: 0, transform: `translateX(${whip.x}px) scale(${whip.scale})`}}
      >
        {/* 1. footage (carries the voice audio) */}
        <AbsoluteFill style={cam}>
          <OffthreadVideo src={staticFile(E.video)} style={{...fill, filter: `${GRADE} grayscale(${bw})`}} />
        </AbsoluteFill>

        {/* 2. graphics that live behind the speaker */}
        <AbsoluteFill>
          {E.houseStrike && <HouseStrike cfg={E.houseStrike} />}
          <Headlines items={E.headlines} layer="behind" hasSubject={hasSubject} />
        </AbsoluteFill>

        {/* 3. cut-out speaker (always full colour, even when background is B&W) */}
        {hasSubject && (
          <AbsoluteFill style={cam}>
            <OffthreadVideo src={staticFile(E.subject!)} transparent muted style={{...fill, filter: GRADE}} />
          </AbsoluteFill>
        )}

        {/* 4. front graphics */}
        <AbsoluteFill>
          <Headlines items={E.headlines} layer="front" hasSubject={hasSubject} />
          {E.phone && <Phone cfg={E.phone} />}
          <Captions items={E.captions} />
        </AbsoluteFill>
      </DirBlur>

      {/* music bed + sound effects */}
      {E.music && <Audio src={staticFile(E.music.file)} volume={E.music.volume} loop />}
      {E.sfx.map((s, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(s.t * fps))} layout="none">
          <Audio src={staticFile('sfx/' + s.file)} volume={s.vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
