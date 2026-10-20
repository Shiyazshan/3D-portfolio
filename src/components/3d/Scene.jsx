import { Component, Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'
import { Avatar, AVATAR_URL } from './Avatar'
import { CameraRig } from './CameraRig'
import { ExperienceWorld } from './ExperienceWorld'

/** Catches a missing/broken avatar file so the rest of the world still renders. */
class AvatarBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    console.error(`[Scene] Could not load the avatar from ${AVATAR_URL}. See README → "Replacing the avatar".`, error)
    this.props.onError?.()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export default function Scene({ isMobile, skills, projects, onAvatarError }) {
  const [quality, setQuality] = useState(isMobile ? 'low' : 'high')

  return (
    <Canvas
      shadows={quality === 'high'}
      // Phones: cap pixel density at 1.25× — sharp enough on a small screen, ~40% fewer pixels
      // to shade than 1.5×. Desktop: up to 1.75×. AdaptiveDpr lowers it further under load.
      dpr={isMobile ? [1, 1.25] : [1, 1.75]}
      gl={{ antialias: !isMobile, stencil: false, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping }}
      camera={{ fov: 38, near: 0.1, far: 80, position: [0, 3, 12] }}
      aria-hidden="true"
    >
      {/* Drop to the low-quality scene if the device can't hold a good frame rate. */}
      <PerformanceMonitor onDecline={() => setQuality('low')} flipflops={2} />
      <AdaptiveDpr pixelated={false} />
      <CameraRig />
      <ExperienceWorld quality={quality} skills={skills} projects={projects} />
      <AvatarBoundary onError={onAvatarError}>
        <Suspense fallback={null}>
          <Avatar castShadow={quality === 'high'} lite={quality === 'low'} />
        </Suspense>
      </AvatarBoundary>
    </Canvas>
  )
}
