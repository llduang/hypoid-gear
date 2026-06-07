'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

// Starfield background - small dots scattered in the scene
export function Starfield({ count = 500 }: { count?: number }) {
  const points = useMemo(() => {
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // Scatter in a large sphere
      const r = 40 + Math.random() * 40
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
    }
    return positions
  }, [count])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[points, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.15}
        sizeAttenuation
        transparent
        opacity={0.3}
        depthWrite={false}
      />
    </points>
  )
}

// Fading grid with opacity falloff at edges
export function FadingGrid() {
  const gridRef = useRef<THREE.Group>(null)

  const gridLines = useMemo(() => {
    const lines: { start: [number, number, number]; end: [number, number, number]; opacity: number }[] = []
    const size = 12
    const divisions = 24
    const step = (size * 2) / divisions

    for (let i = 0; i <= divisions; i++) {
      const pos = -size + i * step
      const distFromCenter = Math.abs(pos) / size
      const opacity = Math.max(0.03, 0.12 * (1 - distFromCenter * distFromCenter))

      // Lines along X
      lines.push({
        start: [pos, -0.01, -size],
        end: [pos, -0.01, size],
        opacity: i === divisions / 2 ? 0.15 : opacity,
      })
      // Lines along Z
      lines.push({
        start: [-size, -0.01, pos],
        end: [size, -0.01, pos],
        opacity: i === divisions / 2 ? 0.15 : opacity,
      })
    }
    return lines
  }, [])

  return (
    <group ref={gridRef}>
      {gridLines.map((line, i) => {
        const points: [number, number, number][] = [line.start, line.end]
        return (
          <line key={i}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array([...line.start, ...line.end]), 3]}
                count={2}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color="#ffffff"
              transparent
              opacity={line.opacity}
              depthWrite={false}
            />
          </line>
        )
      })}
    </group>
  )
}

// Ground plane shadow/reflection
export function GroundShadow() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 3]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial
        color="#000000"
        transparent
        opacity={0.15}
        depthWrite={false}
      />
    </mesh>
  )
}

// Pulsing glow on node point P
export function PulsingPoint({ position, baseRadius = 0.2 }: {
  position: THREE.Vector3
  baseRadius?: number
}) {
  const ringRef = useRef<THREE.Mesh>(null)
  const innerRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const pulse = 1 + 0.15 * Math.sin(t * 2.5)
    if (ringRef.current) {
      ringRef.current.scale.setScalar(pulse)
      ;(ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.12 + 0.06 * Math.sin(t * 2.5)
    }
    if (innerRef.current) {
      const innerPulse = 1 + 0.08 * Math.sin(t * 3)
      innerRef.current.scale.setScalar(innerPulse)
    }
  })

  return (
    <group position={position}>
      {/* Core sphere */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[baseRadius, 16, 16]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.6} />
      </mesh>
      {/* Pulsing outer ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[baseRadius * 1.5, baseRadius * 2.2, 24]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Second ring, offset phase */}
      <PulsingRing position={position} baseRadius={baseRadius} phaseOffset={Math.PI} />
    </group>
  )
}

function PulsingRing({ position, baseRadius, phaseOffset }: {
  position: THREE.Vector3
  baseRadius: number
  phaseOffset: number
}) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime + phaseOffset
    const pulse = 1 + 0.2 * Math.sin(t * 1.8)
    if (ref.current) {
      ref.current.scale.setScalar(pulse)
      ;(ref.current.material as THREE.MeshBasicMaterial).opacity = 0.06 + 0.04 * Math.sin(t * 1.8)
    }
  })

  return (
    <mesh ref={ref} position={position.clone().negate()} rotation={[0, 0, Math.PI / 4]}>
      <ringGeometry args={[baseRadius * 2.0, baseRadius * 2.6, 24]} />
      <meshBasicMaterial color="#ef4444" transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}

// Axis labels that always face the camera (billboard-style using Html)
export function AxisLabel({ position, text, color }: {
  position: [number, number, number]
  text: string
  color: string
}) {
  return (
    <Html position={position} center>
      <div style={{
        color,
        fontSize: '11px',
        fontWeight: 'bold',
        fontFamily: 'monospace',
        whiteSpace: 'nowrap',
        textShadow: '0 0 6px rgba(0,0,0,1), 0 0 12px rgba(0,0,0,0.5)',
        pointerEvents: 'none',
        userSelect: 'none',
        background: 'rgba(0,0,0,0.4)',
        padding: '1px 6px',
        borderRadius: '3px',
        border: `1px solid ${color}33`,
      }}>
        {text}
      </div>
    </Html>
  )
}
