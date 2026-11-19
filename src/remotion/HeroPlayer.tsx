import { Player } from '@remotion/player';
import { HeroScene } from './HeroScene';
import { HERO_DURATION_FRAMES, HERO_FPS, HERO_HEIGHT, HERO_WIDTH } from './heroConstants';

export default function HeroPlayer() {
  return (
    <Player
      component={HeroScene}
      durationInFrames={HERO_DURATION_FRAMES}
      compositionWidth={HERO_WIDTH}
      compositionHeight={HERO_HEIGHT}
      fps={HERO_FPS}
      loop
      autoPlay
      acknowledgeRemotionLicense
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}
