import React from 'react';
import {Composition} from 'remotion';
import {Reel} from './Reel';
import edit from './edit.json';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Reel"
    component={Reel}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={Math.ceil(edit.durationSec * 30)}
  />
);
