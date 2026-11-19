import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';

import { HERO_DURATION_FRAMES, HERO_IMAGE } from './heroConstants';

export function HeroScene() {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [0, HERO_DURATION_FRAMES], [1.05, 1.15], {
    extrapolateRight: 'clamp',
  });

  const translateY = interpolate(frame, [0, HERO_DURATION_FRAMES], [0, -24], {
    extrapolateRight: 'clamp',
  });

  const washStrength = interpolate(
    frame,
    [0, HERO_DURATION_FRAMES / 2, HERO_DURATION_FRAMES],
    [0.88, 0.78, 0.88],
    { extrapolateRight: 'clamp' },
  );

  return (
    // Transparent so the landing page's eager static hero <img> shows through until
    // (and in case) the Player paints its own frame.
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <Img
          src={HERO_IMAGE}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${scale}) translateY(${translateY}px)`,
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, rgba(243, 240, 232, ${washStrength}) 0%, rgba(243, 240, 232, 0.45) 55%, rgba(243, 240, 232, 0.12) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
}
