import { Composition } from 'remotion';
import { HeroScene } from './HeroScene';
import {
  HERO_DURATION_FRAMES,
  HERO_FPS,
  HERO_HEIGHT,
  HERO_WIDTH,
} from './heroConstants';

export const RemotionRoot = () => (
  <>
    <Composition
      id="HeroScene"
      component={HeroScene}
      durationInFrames={HERO_DURATION_FRAMES}
      fps={HERO_FPS}
      width={HERO_WIDTH}
      height={HERO_HEIGHT}
    />
  </>
);
