'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import { Card, CardContent } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { computeHypoidGeometry } from '@/lib/hypoid-geometry'
import type { HypoidGeometry } from '@/lib/hypoid-geometry'
import { ParameterEffectGraph } from '@/components/hypoid/parameter-effect-graph'
import { SaveLoadParams } from '@/components/hypoid/save-load-params'
import { FormulaDerivationPanel } from '@/components/hypoid/formula-derivation'
import { AnimationTimeline } from '@/components/hypoid/animation-timeline'
import { Starfield, FadingGrid, GroundShadow, PulsingPoint, AxisLabel } from '@/components/hypoid/scene-enhancements'
import { ConeUnrolling } from '@/components/hypoid/cone-unrolling'
import { PresetComparison } from '@/components/hypoid/preset-comparison'
import { InvoluteProfile } from '@/components/hypoid/involute-profile'
import { SensitivityHeatmap } from '@/components/hypoid/sensitivity-heatmap'
import { t, setStoredLang, setStoredTheme } from '@/lib/i18n'
import type { Lang, ThemeName } from '@/lib/i18n'

// ============================================================
// Camera Controller (for preset views with smooth transitions)
// ============================================================

function CameraController({ view, onCameraUpdate, onFpsUpdate }: { view: string; onCameraUpdate?: (pos: THREE.Vector3) => void; onFpsUpdate?: (fps: number) => void }) {
  const { camera } = useThree()
  const targetPos = useRef(new THREE.Vector3(12, 8, 10))
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 3))
  const isAnimating = useRef(false)
  const frameCount = useRef(0)
  const lastFpsTime = useRef(performance.now())

  useEffect(() => {
    const targets: Record<string, [number, number, number]> = {
      iso: [12, 8, 10],
      front: [0, 0, 18],
      side: [18, 0, 0],
      top: [0, 18, 0.01],
    }
    const key = view.replace(/\d+$/, '') // Strip timestamp suffix
    const pos = targets[key] || targets.iso
    targetPos.current.set(pos[0], pos[1], pos[2])
    isAnimating.current = true
  }, [view])

  useFrame(() => {
    if (!isAnimating.current) return
    const lerpFactor = 0.08
    camera.position.lerp(targetPos.current, lerpFactor)
    const currentLookAt = new THREE.Vector3(0, 0, 3)
    camera.lookAt(currentLookAt)
    if (camera.position.distanceTo(targetPos.current) < 0.05) {
      isAnimating.current = false
    }
  })

  useFrame(() => {
    onCameraUpdate?.(camera.position.clone())
    // FPS counter - update every 500ms
    frameCount.current++
    const now = performance.now()
    if (now - lastFpsTime.current >= 500) {
      const fps = Math.round(frameCount.current / ((now - lastFpsTime.current) / 1000))
      onFpsUpdate?.(fps)
      frameCount.current = 0
      lastFpsTime.current = now
    }
  })

  return null
}

// ============================================================
// 3D Scene Components
// ============================================================

function PointSphere({ position, color, radius = 0.12, label, labelOffset = [0.2, 0.2, 0], onHover, onClickPoint, pointId }: {
  position: THREE.Vector3
  color: string
  radius?: number
  label?: string
  labelOffset?: [number, number, number]
  onHover?: (id: string | null) => void
  onClickPoint?: (id: string) => void
  pointId?: string
}) {
  return (
    <group>
      <mesh
        position={position}
        onPointerOver={() => onHover?.(pointId ?? null)}
        onPointerOut={() => onHover?.(null)}
        onClick={() => pointId && onClickPoint?.(pointId)}
      >
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      {/* Glow ring */}
      <mesh position={position}>
        <ringGeometry args={[radius * 1.3, radius * 1.6, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
      {label && (
        <Html position={position.clone().add(new THREE.Vector3(...labelOffset))} center>
          <div style={{
            color,
            fontSize: '13px',
            fontWeight: 'bold',
            fontFamily: 'serif',
            whiteSpace: 'nowrap',
            textShadow: '0 0 6px rgba(0,0,0,1), 0 0 12px rgba(0,0,0,0.7)',
            pointerEvents: 'none',
            userSelect: 'none',
            background: 'rgba(0,0,0,0.35)',
            padding: '1px 6px',
            borderRadius: '3px',
            border: `1px solid ${color}33`,
          }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  )
}

function AxisArrow({ start, end, color, lineWidth = 3 }: {
  start: THREE.Vector3
  end: THREE.Vector3
  color: string
  lineWidth?: number
}) {
  const dir = end.clone().sub(start).normalize()
  const arrowLen = 0.6
  const arrowRadius = 0.18
  const shaftEnd = end.clone().sub(dir.clone().multiplyScalar(arrowLen))

  return (
    <group>
      <Line
        points={[start.toArray() as [number, number, number], shaftEnd.toArray() as [number, number, number]]}
        color={color}
        lineWidth={lineWidth}
      />
      <mesh position={shaftEnd.clone().add(dir.clone().multiplyScalar(arrowLen / 2))} rotation={new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir))}>
        <coneGeometry args={[arrowRadius, arrowLen, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

function ConeMesh({ vertex, baseCenter, axisDir, radius, height, color, opacity = 0.15 }: {
  vertex: THREE.Vector3
  baseCenter: THREE.Vector3
  axisDir: THREE.Vector3
  radius: number
  height: number
  color: string
  opacity?: number
}) {
  if (radius < 0.01 || height < 0.01) return null

  const segments = 48
  const positions: number[] = []
  const indices: number[] = []

  positions.push(vertex.x, vertex.y, vertex.z)

  const axis = axisDir.clone().normalize()
  let perp1 = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0))
  if (perp1.length() < 0.01) {
    perp1 = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(1, 0, 0))
  }
  perp1.normalize()
  const perp2 = new THREE.Vector3().crossVectors(axis, perp1).normalize()

  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments
    const x = baseCenter.x + radius * (Math.cos(angle) * perp1.x + Math.sin(angle) * perp2.x)
    const y = baseCenter.y + radius * (Math.cos(angle) * perp1.y + Math.sin(angle) * perp2.y)
    const z = baseCenter.z + radius * (Math.cos(angle) * perp1.z + Math.sin(angle) * perp2.z)
    positions.push(x, y, z)
  }

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments
    indices.push(0, i + 1, next + 1)
  }

  const centerIdx = segments + 1
  positions.push(baseCenter.x, baseCenter.y, baseCenter.z)
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments
    indices.push(centerIdx, next + 1, i + 1)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
        roughness={0.4}
        metalness={0.15}
      />
    </mesh>
  )
}

function ConeWireframe({ vertex, baseCenter, axisDir, radius, color }: {
  vertex: THREE.Vector3
  baseCenter: THREE.Vector3
  axisDir: THREE.Vector3
  radius: number
  color: string
}) {
  if (radius < 0.01) return null

  const axis = axisDir.clone().normalize()
  let perp1 = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0))
  if (perp1.length() < 0.01) {
    perp1 = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(1, 0, 0))
  }
  perp1.normalize()
  const perp2 = new THREE.Vector3().crossVectors(axis, perp1).normalize()

  const lines: React.ReactNode[] = []

  const segments = 64
  const basePoints: [number, number, number][] = []
  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments
    const x = baseCenter.x + radius * (Math.cos(angle) * perp1.x + Math.sin(angle) * perp2.x)
    const y = baseCenter.y + radius * (Math.cos(angle) * perp1.y + Math.sin(angle) * perp2.y)
    const z = baseCenter.z + radius * (Math.cos(angle) * perp1.z + Math.sin(angle) * perp2.z)
    basePoints.push([x, y, z])
  }
  lines.push(
    <Line key="base" points={basePoints} color={color} lineWidth={1.5} transparent opacity={0.7} />
  )

  const midRatio = 0.6
  const midCenter = vertex.clone().lerp(baseCenter, midRatio)
  const midRadius = radius * midRatio
  const midPoints: [number, number, number][] = []
  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments
    const x = midCenter.x + midRadius * (Math.cos(angle) * perp1.x + Math.sin(angle) * perp2.x)
    const y = midCenter.y + midRadius * (Math.cos(angle) * perp1.y + Math.sin(angle) * perp2.y)
    const z = midCenter.z + midRadius * (Math.cos(angle) * perp1.z + Math.sin(angle) * perp2.z)
    midPoints.push([x, y, z])
  }
  lines.push(
    <Line key="mid" points={midPoints} color={color} lineWidth={0.8} transparent opacity={0.3} />
  )

  for (let i = 0; i < 12; i++) {
    const angle = (2 * Math.PI * i) / 12
    const x = baseCenter.x + radius * (Math.cos(angle) * perp1.x + Math.sin(angle) * perp2.x)
    const y = baseCenter.y + radius * (Math.cos(angle) * perp1.y + Math.sin(angle) * perp2.y)
    const z = baseCenter.z + radius * (Math.cos(angle) * perp1.z + Math.sin(angle) * perp2.z)
    lines.push(
      <Line
        key={`gen-${i}`}
        points={[[vertex.x, vertex.y, vertex.z], [x, y, z]] as [number, number, number][]}
        color={color}
        lineWidth={0.8}
        transparent
        opacity={0.3}
      />
    )
  }

  return <group>{lines}</group>
}

function PlaneMesh({ corners, color, opacity = 0.08 }: {
  corners: THREE.Vector3[]
  color: string
  opacity?: number
}) {
  if (corners.length < 3) return null
  const geometry = new THREE.BufferGeometry()
  const vertices = new Float32Array([
    ...corners[0].toArray(), ...corners[1].toArray(), ...corners[2].toArray(),
    ...corners[0].toArray(), ...corners[2].toArray(), ...corners[3].toArray(),
  ])
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.computeVertexNormals()

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function PlaneBorder({ corners, color }: {
  corners: THREE.Vector3[]
  color: string
}) {
  const points: [number, number, number][] = corners.map(c => c.toArray() as [number, number, number])
  points.push(corners[0].toArray() as [number, number, number])
  return <Line points={points} color={color} lineWidth={1.5} dashed dashSize={0.4} gapSize={0.2} />
}

function AngleArc({ center, dir1, dir2, radius: arcRadius, color, label }: {
  center: THREE.Vector3
  dir1: THREE.Vector3
  dir2: THREE.Vector3
  radius: number
  color: string
  label?: string
}) {
  const d1 = dir1.clone().normalize()
  const d2 = dir2.clone().normalize()
  const angle = Math.acos(Math.min(1, Math.max(-1, d1.dot(d2))))

  if (angle < 0.02 || angle > Math.PI - 0.02) return null

  const segments = 32
  const points: [number, number, number][] = []
  const rotAxis = new THREE.Vector3().crossVectors(d1, d2)
  if (rotAxis.length() < 1e-6) return null
  rotAxis.normalize()

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const theta = angle * t
    const dir = d1.clone().applyAxisAngle(rotAxis, theta)
    const point = center.clone().add(dir.multiplyScalar(arcRadius))
    points.push(point.toArray() as [number, number, number])
  }

  const midDir = d1.clone().applyAxisAngle(rotAxis, angle / 2).normalize()

  return (
    <group>
      <Line points={points} color={color} lineWidth={2} />
      {label && (
        <Html
          position={center.clone().add(midDir.multiplyScalar(arcRadius * 1.4))}
          center
        >
          <div style={{
            color,
            fontSize: '12px',
            fontWeight: 'bold',
            fontFamily: 'serif',
            whiteSpace: 'nowrap',
            textShadow: '0 0 6px rgba(0,0,0,1)',
            pointerEvents: 'none',
            background: 'rgba(0,0,0,0.4)',
            padding: '1px 5px',
            borderRadius: '3px',
          }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  )
}

function RightAngleMarker({ point, dir1, dir2, size = 0.5, color = '#ef4444' }: {
  point: THREE.Vector3
  dir1: THREE.Vector3
  dir2: THREE.Vector3
  size?: number
  color?: string
}) {
  const d1 = dir1.clone().normalize()
  const d2 = dir2.clone().normalize()
  const p1 = point.clone().add(d1.clone().multiplyScalar(size))
  const p2 = point.clone().add(d2.clone().multiplyScalar(size))
  const p3 = p1.clone().add(d2.clone().multiplyScalar(size))

  return (
    <Line
      points={[
        p1.toArray() as [number, number, number],
        p3.toArray() as [number, number, number],
        p2.toArray() as [number, number, number],
      ]}
      color={color}
      lineWidth={2}
    />
  )
}

function DimensionLine({ start, end, color, label, offset = [0, 0.4, 0] }: {
  start: THREE.Vector3
  end: THREE.Vector3
  color: string
  label: string
  offset?: [number, number, number]
}) {
  const mid = start.clone().add(end).multiplyScalar(0.5)
  const len = start.distanceTo(end)
  const dir = end.clone().sub(start).normalize()
  const perp = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0))
  if (perp.length() < 0.01) perp.crossVectors(dir, new THREE.Vector3(1, 0, 0))
  perp.normalize()
  const tickSize = 0.2

  return (
    <group>
      <Line
        points={[
          start.clone().add(perp.clone().multiplyScalar(tickSize)).toArray() as [number, number, number],
          start.clone().sub(perp.clone().multiplyScalar(tickSize)).toArray() as [number, number, number],
        ]}
        color={color}
        lineWidth={1.5}
      />
      <Line
        points={[
          end.clone().add(perp.clone().multiplyScalar(tickSize)).toArray() as [number, number, number],
          end.clone().sub(perp.clone().multiplyScalar(tickSize)).toArray() as [number, number, number],
        ]}
        color={color}
        lineWidth={1.5}
      />
      <Line
        points={[
          start.toArray() as [number, number, number],
          end.toArray() as [number, number, number],
        ]}
        color={color}
        lineWidth={1.5}
        dashed
        dashSize={0.15}
        gapSize={0.08}
      />
      <Html position={mid.clone().add(new THREE.Vector3(...offset))} center>
        <div style={{
          color,
          fontSize: '11px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          textShadow: '0 0 6px rgba(0,0,0,1)',
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.5)',
          padding: '1px 5px',
          borderRadius: '3px',
        }}>
          {label} = {len.toFixed(2)}
        </div>
      </Html>
    </group>
  )
}

function OffsetLine({ O1, O2 }: {
  O1: THREE.Vector3
  O2: THREE.Vector3
}) {
  const mid = O1.clone().add(O2).multiplyScalar(0.5)
  return (
    <group>
      <Line
        points={[O1.toArray() as [number, number, number], O2.toArray() as [number, number, number]]}
        color="#94a3b8"
        lineWidth={2}
        dashed
        dashSize={0.25}
        gapSize={0.12}
      />
      <Html position={mid.clone().add(new THREE.Vector3(0, 0.35, 0))} center>
        <div style={{
          color: '#94a3b8',
          fontSize: '11px',
          fontWeight: 'bold',
          fontFamily: 'serif',
          whiteSpace: 'nowrap',
          textShadow: '0 0 6px rgba(0,0,0,1)',
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.4)',
          padding: '1px 5px',
          borderRadius: '3px',
        }}>
          Eₚ = O₁O₂
        </div>
      </Html>
    </group>
  )
}

// Pitch circle ring at cone base
function PitchCircle({ center, axisDir, radius, color }: {
  center: THREE.Vector3
  axisDir: THREE.Vector3
  radius: number
  color: string
}) {
  if (radius < 0.01) return null
  const axis = axisDir.clone().normalize()
  let perp1 = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0))
  if (perp1.length() < 0.01) {
    perp1 = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(1, 0, 0))
  }
  perp1.normalize()
  const perp2 = new THREE.Vector3().crossVectors(axis, perp1).normalize()

  const segments = 64
  const points: [number, number, number][] = []
  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments
    const x = center.x + radius * (Math.cos(angle) * perp1.x + Math.sin(angle) * perp2.x)
    const y = center.y + radius * (Math.cos(angle) * perp1.y + Math.sin(angle) * perp2.y)
    const z = center.z + radius * (Math.cos(angle) * perp1.z + Math.sin(angle) * perp2.z)
    points.push([x, y, z])
  }
  return <Line points={points} color={color} lineWidth={2.5} />
}

function GearToothMarkers({ center, axisDir, radius, color, count = 8 }: {
  center: THREE.Vector3
  axisDir: THREE.Vector3
  radius: number
  color: string
  count?: number
}) {
  if (radius < 0.01) return null
  const axis = axisDir.clone().normalize()
  let perp1 = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0))
  if (perp1.length() < 0.01) {
    perp1 = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(1, 0, 0))
  }
  perp1.normalize()
  const perp2 = new THREE.Vector3().crossVectors(axis, perp1).normalize()

  const markers: React.ReactNode[] = []
  const toothSize = Math.max(radius * 0.12, 0.08)
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count
    const pos = new THREE.Vector3(
      center.x + radius * (Math.cos(angle) * perp1.x + Math.sin(angle) * perp2.x),
      center.y + radius * (Math.cos(angle) * perp1.y + Math.sin(angle) * perp2.y),
      center.z + radius * (Math.cos(angle) * perp1.z + Math.sin(angle) * perp2.z),
    )
    markers.push(
      <mesh key={i} position={pos}>
        <boxGeometry args={[toothSize, toothSize, toothSize * 0.4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} transparent opacity={0.4} />
      </mesh>
    )
  }
  return <group>{markers}</group>
}

function CrossSectionCircles({ geo }: { geo: HypoidGeometry }) {
  const smallCirclePoints: [number, number, number][] = []
  const largeCirclePoints: [number, number, number][] = []

  const smallAxis = geo.axisPDir.clone().normalize()
  let smallPerp1 = new THREE.Vector3().crossVectors(smallAxis, new THREE.Vector3(0, 1, 0))
  if (smallPerp1.length() < 0.01) {
    smallPerp1 = new THREE.Vector3().crossVectors(smallAxis, new THREE.Vector3(1, 0, 0))
  }
  smallPerp1.normalize()
  const smallPerp2 = new THREE.Vector3().crossVectors(smallAxis, smallPerp1).normalize()

  const segments = 64
  const smallBaseCenter = geo.smallConeBaseCenter
  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments
    const x = smallBaseCenter.x + geo.Rp * (Math.cos(angle) * smallPerp1.x + Math.sin(angle) * smallPerp2.x)
    const y = smallBaseCenter.y + geo.Rp * (Math.cos(angle) * smallPerp1.y + Math.sin(angle) * smallPerp2.y)
    const z = smallBaseCenter.z + geo.Rp * (Math.cos(angle) * smallPerp1.z + Math.sin(angle) * smallPerp2.z)
    smallCirclePoints.push([x, y, z])
  }

  const largeAxis = geo.axisGDir.clone().normalize()
  let largePerp1 = new THREE.Vector3().crossVectors(largeAxis, new THREE.Vector3(0, 1, 0))
  if (largePerp1.length() < 0.01) {
    largePerp1 = new THREE.Vector3().crossVectors(largeAxis, new THREE.Vector3(1, 0, 0))
  }
  largePerp1.normalize()
  const largePerp2 = new THREE.Vector3().crossVectors(largeAxis, largePerp1).normalize()

  const largeBaseCenter = geo.largeConeBaseCenter
  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments
    const x = largeBaseCenter.x + geo.R * (Math.cos(angle) * largePerp1.x + Math.sin(angle) * largePerp2.x)
    const y = largeBaseCenter.y + geo.R * (Math.cos(angle) * largePerp1.y + Math.sin(angle) * largePerp2.y)
    const z = largeBaseCenter.z + geo.R * (Math.cos(angle) * largePerp1.z + Math.sin(angle) * largePerp2.z)
    largeCirclePoints.push([x, y, z])
  }

  return (
    <group>
      <Line points={smallCirclePoints} color="#fbbf24" lineWidth={2} dashed dashSize={0.3} gapSize={0.15} />
      <Line points={largeCirclePoints} color="#34d399" lineWidth={2} dashed dashSize={0.3} gapSize={0.15} />
      <Html position={smallBaseCenter.clone().add(new THREE.Vector3(0, geo.Rp + 0.4, 0))} center>
        <div style={{
          color: '#fbbf24',
          fontSize: '11px',
          fontWeight: 'bold',
          fontFamily: 'serif',
          whiteSpace: 'nowrap',
          textShadow: '0 0 6px rgba(0,0,0,1)',
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.5)',
          padding: '1px 6px',
          borderRadius: '3px',
          border: '1px solid #fbbf2433',
        }}>
          Rₚ = {geo.Rp.toFixed(2)}
        </div>
      </Html>
      <Html position={largeBaseCenter.clone().add(new THREE.Vector3(0, geo.R + 0.4, 0))} center>
        <div style={{
          color: '#34d399',
          fontSize: '11px',
          fontWeight: 'bold',
          fontFamily: 'serif',
          whiteSpace: 'nowrap',
          textShadow: '0 0 6px rgba(0,0,0,1)',
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.5)',
          padding: '1px 6px',
          borderRadius: '3px',
          border: '1px solid #34d39933',
        }}>
          R = {geo.R.toFixed(2)}
        </div>
      </Html>
    </group>
  )
}

// Dashed line for K1K2
function AnimatedDashedLine({ start, end, color }: {
  start: THREE.Vector3
  end: THREE.Vector3
  color: string
}) {
  return (
    <Line
      points={[start.toArray() as [number, number, number], end.toArray() as [number, number, number]]}
      color={color}
      lineWidth={2.5}
    />
  )
}

// Pulsing glow ring at cone base pitch circle
function GlowRing({ center, axisDir, radius, color }: {
  center: THREE.Vector3
  axisDir: THREE.Vector3
  radius: number
  color: string
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(() => {
    if (!materialRef.current) return
    const t = Date.now() * 0.002
    materialRef.current.opacity = 0.1 + Math.sin(t) * 0.1
  })

  if (radius < 0.01) return null

  const axis = axisDir.clone().normalize()
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis)

  return (
    <mesh ref={meshRef} position={center} quaternion={quaternion}>
      <ringGeometry args={[radius * 0.95, radius * 1.08, 64]} />
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        transparent
        opacity={0.2}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

// Ambient floating particle system
function AmbientParticles({ count = 80 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30
      pos[i * 3 + 1] = Math.random() * 15 - 2
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30 + 3
      vel[i * 3] = (Math.random() - 0.5) * 0.01
      vel[i * 3 + 1] = 0.005 + Math.random() * 0.01
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.01
    }
    return { positions: pos, velocities: vel }
  }, [count])

  useFrame(() => {
    if (!pointsRef.current) return
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array
    for (let i = 0; i < count; i++) {
      arr[i * 3] += velocities[i * 3]
      arr[i * 3 + 1] += velocities[i * 3 + 1]
      arr[i * 3 + 2] += velocities[i * 3 + 2]
      if (arr[i * 3 + 1] > 15) {
        arr[i * 3 + 1] = -2
        arr[i * 3] = (Math.random() - 0.5) * 30
        arr[i * 3 + 2] = (Math.random() - 0.5) * 30 + 3
      }
    }
    posAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#fbbf24"
        size={0.08}
        sizeAttenuation
        transparent
        opacity={0.25}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// Grid reflection plane
function GridReflection() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 3]} receiveShadow>
      <planeGeometry args={[24, 24]} />
      <meshStandardMaterial
        color="#0a0a12"
        transparent
        opacity={0.25}
        depthWrite={false}
        metalness={0.5}
        roughness={0.8}
      />
    </mesh>
  )
}

// ============================================================
// Rotating Group (for both rotation and meshing)
// ============================================================

function RotatingGroup({ pivot, axis, speed, enabled, children }: {
  pivot: THREE.Vector3
  axis: THREE.Vector3
  speed: number
  enabled: boolean
  children: React.ReactNode
}) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_state, delta) => {
    if (!enabled || !groupRef.current) return
    const rotQ = new THREE.Quaternion().setFromAxisAngle(axis.clone().normalize(), delta * speed)
    groupRef.current.quaternion.premultiply(rotQ)
  })

  if (!enabled) return <>{children}</>

  return (
    <group ref={groupRef} position={pivot}>
      <group position={pivot.clone().negate()}>
        {children}
      </group>
    </group>
  )
}

// ============================================================
// Contact Zone Glow for Meshing
// ============================================================

function ContactZoneGlow({ position, enabled }: { position: THREE.Vector3; enabled: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (!meshRef.current || !enabled) return
    const t = Date.now() * 0.003
    const scale = 1 + Math.sin(t) * 0.3
    meshRef.current.scale.set(scale, scale, scale)
  })

  if (!enabled) return null

  return (
    <group>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={0.15}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position={position}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

// ============================================================
// Contact Ellipse Visualization (Feature 4)
// ============================================================

function ContactEllipse({ position, axisDir, semiA = 0.4, semiB = 0.2 }: {
  position: THREE.Vector3
  axisDir: THREE.Vector3
  semiA?: number
  semiB?: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  // Create ellipse geometry
  const geometry = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, semiA, semiB, 0, 2 * Math.PI, false, 0)
    const points2D = curve.getPoints(64)
    const shape = new THREE.Shape()
    shape.moveTo(points2D[0].x, points2D[0].y)
    for (let i = 1; i < points2D.length; i++) {
      shape.lineTo(points2D[i].x, points2D[i].y)
    }
    // Create ring by making a hole slightly smaller
    const holeCurve = new THREE.EllipseCurve(0, 0, semiA * 0.7, semiB * 0.7, 0, 2 * Math.PI, false, 0)
    const holePoints2D = holeCurve.getPoints(64)
    const hole = new THREE.Path()
    hole.moveTo(holePoints2D[0].x, holePoints2D[0].y)
    for (let i = 1; i < holePoints2D.length; i++) {
      hole.lineTo(holePoints2D[i].x, holePoints2D[i].y)
    }
    shape.holes.push(hole)
    const geo = new THREE.ShapeGeometry(shape, 32)
    return geo
  }, [semiA, semiB])

  // Orient perpendicular to gear axis
  const quaternion = useMemo(() => {
    const axis = axisDir.clone().normalize()
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis)
  }, [axisDir])

  // Pulsing glow animation
  useFrame(() => {
    if (!materialRef.current) return
    const t = Date.now() * 0.002
    materialRef.current.opacity = 0.2 + Math.sin(t) * 0.15
  })

  return (
    <mesh ref={meshRef} position={position} quaternion={quaternion} geometry={geometry}>
      <meshBasicMaterial
        ref={materialRef}
        color="#fbbf24"
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

// ============================================================
// Cone Edge Highlight (Polish 2)
// ============================================================

function ConeEdgeHighlight({ vertex, baseCenter, axisDir, radius, color }: {
  vertex: THREE.Vector3
  baseCenter: THREE.Vector3
  axisDir: THREE.Vector3
  radius: number
  color: string
}) {
  const edges = useMemo(() => {
    if (radius < 0.01) return null
    const segments = 48
    const positions: number[] = []
    const indices: number[] = []

    positions.push(vertex.x, vertex.y, vertex.z)

    const axis = axisDir.clone().normalize()
    let perp1 = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0))
    if (perp1.length() < 0.01) {
      perp1 = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(1, 0, 0))
    }
    perp1.normalize()
    const perp2 = new THREE.Vector3().crossVectors(axis, perp1).normalize()

    for (let i = 0; i < segments; i++) {
      const angle = (2 * Math.PI * i) / segments
      const x = baseCenter.x + radius * (Math.cos(angle) * perp1.x + Math.sin(angle) * perp2.x)
      const y = baseCenter.y + radius * (Math.cos(angle) * perp1.y + Math.sin(angle) * perp2.y)
      const z = baseCenter.z + radius * (Math.cos(angle) * perp1.z + Math.sin(angle) * perp2.z)
      positions.push(x, y, z)
    }

    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments
      indices.push(0, i + 1, next + 1)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()

    const edgesGeo = new THREE.EdgesGeometry(geo, 30)
    return edgesGeo
  }, [vertex, baseCenter, axisDir, radius])

  if (!edges || radius < 0.01) return null

  return (
    <lineSegments geometry={edges}>
      <lineBasicMaterial color={color} transparent opacity={0.4} />
    </lineSegments>
  )
}

// ============================================================
// Animated Helical Tooth Lines (Feature 2)
// ============================================================

function HelicalToothLines({ vertex, baseCenter, axisDir, radius, height, spiralAngle, color, count = 5 }: {
  vertex: THREE.Vector3
  baseCenter: THREE.Vector3
  axisDir: THREE.Vector3
  radius: number
  height: number
  spiralAngle: number
  color: string
  count?: number
}) {
  if (radius < 0.01 || height < 0.01) return null

  const axis = axisDir.clone().normalize()
  let perp1 = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0))
  if (perp1.length() < 0.01) {
    perp1 = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(1, 0, 0))
  }
  perp1.normalize()
  const perp2 = new THREE.Vector3().crossVectors(axis, perp1).normalize()

  const lines: React.ReactNode[] = []
  const segments = 32

  for (let i = 0; i < count; i++) {
    const baseAngle = (2 * Math.PI * i) / count
    const points: [number, number, number][] = []

    for (let j = 0; j <= segments; j++) {
      const t = j / segments
      // Interpolate along the cone surface from vertex to base
      const coneRadius = radius * t
      // Add spiral twist proportional to height and spiral angle
      const twist = t * spiralAngle * 3.0 + baseAngle

      const centerPos = vertex.clone().lerp(baseCenter, t)
      const point = new THREE.Vector3(
        centerPos.x + coneRadius * (Math.cos(twist) * perp1.x + Math.sin(twist) * perp2.x),
        centerPos.y + coneRadius * (Math.cos(twist) * perp1.y + Math.sin(twist) * perp2.y),
        centerPos.z + coneRadius * (Math.cos(twist) * perp1.z + Math.sin(twist) * perp2.z),
      )
      points.push(point.toArray() as [number, number, number])
    }

    lines.push(
      <Line
        key={`helix-${i}`}
        points={points}
        color={color}
        lineWidth={1}
        transparent
        opacity={0.3}
        dashed
        dashSize={0.2}
        gapSize={0.1}
      />
    )
  }

  return <group>{lines}</group>
}

// ============================================================
// Free-click raycaster marker
// ============================================================

function FreeClickPoint({ position, index }: { position: THREE.Vector3; index: number }) {
  return (
    <group>
      <mesh position={position}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color={index === 0 ? '#f59e0b' : '#10b981'} transparent opacity={0.6} />
      </mesh>
      <mesh position={position}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial color={index === 0 ? '#f59e0b' : '#10b981'} transparent opacity={0.15} depthWrite={false} />
      </mesh>
      <Html position={position.clone().add(new THREE.Vector3(0.2, 0.3, 0))} center>
        <div style={{
          color: index === 0 ? '#f59e0b' : '#10b981',
          fontSize: '10px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          textShadow: '0 0 6px rgba(0,0,0,1)',
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.6)',
          padding: '1px 4px',
          borderRadius: '3px',
        }}>
          ({position.x.toFixed(1)}, {position.y.toFixed(1)}, {position.z.toFixed(1)})
        </div>
      </Html>
    </group>
  )
}

// ============================================================
// Raycaster click handler inside canvas
// ============================================================

function RaycasterHandler({ measureMode, freeClickPoints, onFreeClick }: {
  measureMode: boolean
  freeClickPoints: THREE.Vector3[]
  onFreeClick: (point: THREE.Vector3) => void
}) {
  const { scene, camera, gl } = useThree()

  useEffect(() => {
    if (!measureMode) return

    const handleClick = (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      )
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(scene.children, true)

      for (const intersect of intersects) {
        // Skip non-mesh objects (like lines, points, etc.)
        if (intersect.object.type === 'Mesh' && intersect.face) {
          onFreeClick(intersect.point.clone())
          return
        }
      }
    }

    gl.domElement.addEventListener('click', handleClick)
    return () => gl.domElement.removeEventListener('click', handleClick)
  }, [measureMode, camera, scene, gl, onFreeClick])

  // Render free-click point markers
  return (
    <group>
      {freeClickPoints.map((pt, i) => (
        <FreeClickPoint key={i} position={pt} index={i} />
      ))}
    </group>
  )
}

// ============================================================
// Main 3D Scene
// ============================================================

function ForceVectorArrows({ position, axisP, axisG, K1K2Dir, lang }: {
  position: THREE.Vector3
  axisP: THREE.Vector3
  axisG: THREE.Vector3
  K1K2Dir: THREE.Vector3
  lang: Lang
}) {
  const arrowLen = 2.5
  // Fn: common normal direction (perpendicular to both surfaces = along K1K2)
  const fnDir = K1K2Dir.clone().normalize()
  // Ft: tangential force (perpendicular to the plane containing both axes and Fn)
  const ftDir = new THREE.Vector3().crossVectors(fnDir, axisG.clone().normalize()).normalize()
  // Fr: radial force (along cone generator toward axis, perpendicular to Fn and Ft)
  const frDir = new THREE.Vector3().crossVectors(fnDir, ftDir).normalize()

  const arrowHeadLen = 0.35
  const arrowHeadRadius = 0.12

  return (
    <group>
      {/* Fn arrow - white/cyan */}
      <group>
        <Line
          points={[position.toArray() as [number, number, number], position.clone().add(fnDir.clone().multiplyScalar(arrowLen)).toArray() as [number, number, number]]}
          color="#22d3ee"
          lineWidth={3}
        />
        <mesh position={position.clone().add(fnDir.clone().multiplyScalar(arrowLen - arrowHeadLen / 2))} rotation={new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), fnDir))}>
          <coneGeometry args={[arrowHeadRadius, arrowHeadLen, 12]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.5} />
        </mesh>
        <Html position={position.clone().add(fnDir.clone().multiplyScalar(arrowLen + 0.3))} center>
          <div style={{ color: '#22d3ee', fontSize: '11px', fontWeight: 'bold', fontFamily: 'serif', whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,0,0,1)', pointerEvents: 'none', background: 'rgba(0,0,0,0.5)', padding: '1px 5px', borderRadius: '3px' }}>Fn</div>
        </Html>
      </group>

      {/* Ft arrow - amber */}
      <group>
        <Line
          points={[position.toArray() as [number, number, number], position.clone().add(ftDir.clone().multiplyScalar(arrowLen)).toArray() as [number, number, number]]}
          color="#f59e0b"
          lineWidth={3}
        />
        <mesh position={position.clone().add(ftDir.clone().multiplyScalar(arrowLen - arrowHeadLen / 2))} rotation={new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), ftDir))}>
          <coneGeometry args={[arrowHeadRadius, arrowHeadLen, 12]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
        </mesh>
        <Html position={position.clone().add(ftDir.clone().multiplyScalar(arrowLen + 0.3))} center>
          <div style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 'bold', fontFamily: 'serif', whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,0,0,1)', pointerEvents: 'none', background: 'rgba(0,0,0,0.5)', padding: '1px 5px', borderRadius: '3px' }}>Ft</div>
        </Html>
      </group>

      {/* Fr arrow - rose/pink */}
      <group>
        <Line
          points={[position.toArray() as [number, number, number], position.clone().add(frDir.clone().multiplyScalar(arrowLen)).toArray() as [number, number, number]]}
          color="#fb7185"
          lineWidth={3}
        />
        <mesh position={position.clone().add(frDir.clone().multiplyScalar(arrowLen - arrowHeadLen / 2))} rotation={new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), frDir))}>
          <coneGeometry args={[arrowHeadRadius, arrowHeadLen, 12]} />
          <meshStandardMaterial color="#fb7185" emissive="#fb7185" emissiveIntensity={0.5} />
        </mesh>
        <Html position={position.clone().add(frDir.clone().multiplyScalar(arrowLen + 0.3))} center>
          <div style={{ color: '#fb7185', fontSize: '11px', fontWeight: 'bold', fontFamily: 'serif', whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,0,0,1)', pointerEvents: 'none', background: 'rgba(0,0,0,0.5)', padding: '1px 5px', borderRadius: '3px' }}>Fr</div>
        </Html>
      </group>
    </group>
  )
}

// ============================================================
// Cone with animated opacity (Polish 2)
// ============================================================

// ============================================================
// Cone Generator Lines Visualization (Feature 1)
// ============================================================

function ConeGeneratorLines({ vertex, baseCenter, axisDir, radius, color }: {
  vertex: THREE.Vector3
  baseCenter: THREE.Vector3
  axisDir: THREE.Vector3
  radius: number
  color: string
}) {
  if (radius < 0.01) return null

  const axis = axisDir.clone().normalize()
  let perp1 = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0))
  if (perp1.length() < 0.01) {
    perp1 = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(1, 0, 0))
  }
  perp1.normalize()
  const perp2 = new THREE.Vector3().crossVectors(axis, perp1).normalize()

  const angles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]

  return (
    <group>
      {angles.map((angle, i) => {
        const x = baseCenter.x + radius * (Math.cos(angle) * perp1.x + Math.sin(angle) * perp2.x)
        const y = baseCenter.y + radius * (Math.cos(angle) * perp1.y + Math.sin(angle) * perp2.y)
        const z = baseCenter.z + radius * (Math.cos(angle) * perp1.z + Math.sin(angle) * perp2.z)
        return (
          <Line
            key={`gen-${i}`}
            points={[[vertex.x, vertex.y, vertex.z], [x, y, z]] as [number, number, number][]}
            color={color}
            lineWidth={2}
          />
        )
      })}
    </group>
  )
}

// ============================================================
// Cone Surface Normal Vectors at P (Feature 4)
// ============================================================

function ConeNormalVectors({ P, H1, H2, axisPDir, axisGDir, lang }: {
  P: THREE.Vector3
  H1: THREE.Vector3
  H2: THREE.Vector3
  axisPDir: THREE.Vector3
  axisGDir: THREE.Vector3
  lang: Lang
}) {
  // Small cone normal at P: perpendicular to the cone surface, pointing from P toward the pinion axis
  // The normal to the pinion cone at P is perpendicular to both the generator (H1→P) and the axis direction
  // It lies in the plane containing the axis and P, perpendicular to the generator
  const H1P = P.clone().sub(H1).normalize()
  const axisPHat = axisPDir.clone().normalize()
  // Normal perpendicular to the generator, in the axis-generator plane, pointing toward axis
  const smallNormal = axisPHat.clone().multiplyScalar(H1P.dot(axisPHat)).sub(H1P).normalize()

  const H2P = P.clone().sub(H2).normalize()
  const axisGHat = axisGDir.clone().normalize()
  const largeNormal = axisGHat.clone().multiplyScalar(H2P.dot(axisGHat)).sub(H2P).normalize()

  const arrowLen = 1.5
  const arrowHeadLen = 0.25
  const arrowHeadRadius = 0.1

  return (
    <group>
      {/* Small cone normal - cyan */}
      <group>
        <Line
          points={[P.toArray() as [number, number, number], P.clone().add(smallNormal.clone().multiplyScalar(arrowLen)).toArray() as [number, number, number]]}
          color="#22d3ee"
          lineWidth={2.5}
        />
        <mesh position={P.clone().add(smallNormal.clone().multiplyScalar(arrowLen - arrowHeadLen / 2))} rotation={new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), smallNormal))}>
          <coneGeometry args={[arrowHeadRadius, arrowHeadLen, 12]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.5} />
        </mesh>
        <Html position={P.clone().add(smallNormal.clone().multiplyScalar(arrowLen + 0.35))} center>
          <div style={{ color: '#22d3ee', fontSize: '12px', fontWeight: 'bold', fontFamily: 'serif', whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,0,0,1)', pointerEvents: 'none', background: 'rgba(0,0,0,0.5)', padding: '1px 5px', borderRadius: '3px' }}>
            {t('normal.smallCone', lang)}
          </div>
        </Html>
      </group>

      {/* Large cone normal - pink */}
      <group>
        <Line
          points={[P.toArray() as [number, number, number], P.clone().add(largeNormal.clone().multiplyScalar(arrowLen)).toArray() as [number, number, number]]}
          color="#f472b6"
          lineWidth={2.5}
        />
        <mesh position={P.clone().add(largeNormal.clone().multiplyScalar(arrowLen - arrowHeadLen / 2))} rotation={new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), largeNormal))}>
          <coneGeometry args={[arrowHeadRadius, arrowHeadLen, 12]} />
          <meshStandardMaterial color="#f472b6" emissive="#f472b6" emissiveIntensity={0.5} />
        </mesh>
        <Html position={P.clone().add(largeNormal.clone().multiplyScalar(arrowLen + 0.35))} center>
          <div style={{ color: '#f472b6', fontSize: '12px', fontWeight: 'bold', fontFamily: 'serif', whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,0,0,1)', pointerEvents: 'none', background: 'rgba(0,0,0,0.5)', padding: '1px 5px', borderRadius: '3px' }}>
            {t('normal.largeCone', lang)}
          </div>
        </Html>
      </group>
    </group>
  )
}

// ============================================================
// Enhanced Vertex Marker (Feature 3)
// ============================================================

function EnhancedVertexMarker({ position, color, label, subtitle }: {
  position: THREE.Vector3
  color: string
  label: string
  subtitle: string
}) {
  const ringRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (!ringRef.current) return
    const t = Date.now() * 0.003
    const scale = 1 + Math.sin(t) * 0.15
    ringRef.current.scale.set(scale, scale, scale)
  })

  const crossSize = 0.35
  const crossWidth = 0.04

  return (
    <group>
      {/* Main sphere - larger than before */}
      <mesh position={position}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>

      {/* Pulsing ring */}
      <mesh ref={ringRef} position={position}>
        <ringGeometry args={[0.28, 0.38, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Glow sphere (additive blending) */}
      <mesh ref={glowRef} position={position}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Cross/plus marker - 4 short lines at 45° angles */}
      <Line
        points={[
          position.clone().add(new THREE.Vector3(-crossSize, crossSize, 0)).toArray() as [number, number, number],
          position.clone().add(new THREE.Vector3(crossSize, -crossSize, 0)).toArray() as [number, number, number],
        ]}
        color={color}
        lineWidth={2}
      />
      <Line
        points={[
          position.clone().add(new THREE.Vector3(crossSize, crossSize, 0)).toArray() as [number, number, number],
          position.clone().add(new THREE.Vector3(-crossSize, -crossSize, 0)).toArray() as [number, number, number],
        ]}
        color={color}
        lineWidth={2}
      />
      <Line
        points={[
          position.clone().add(new THREE.Vector3(0, -crossSize, crossSize)).toArray() as [number, number, number],
          position.clone().add(new THREE.Vector3(0, crossSize, -crossSize)).toArray() as [number, number, number],
        ]}
        color={color}
        lineWidth={2}
      />
      <Line
        points={[
          position.clone().add(new THREE.Vector3(0, crossSize, crossSize)).toArray() as [number, number, number],
          position.clone().add(new THREE.Vector3(0, -crossSize, -crossSize)).toArray() as [number, number, number],
        ]}
        color={color}
        lineWidth={2}
      />

      {/* Label with subtitle */}
      <Html position={position.clone().add(new THREE.Vector3(0.25, 0.4, 0))} center>
        <div style={{
          color,
          fontSize: '13px',
          fontWeight: 'bold',
          fontFamily: 'serif',
          whiteSpace: 'nowrap',
          textShadow: '0 0 6px rgba(0,0,0,1), 0 0 12px rgba(0,0,0,0.7)',
          pointerEvents: 'none',
          userSelect: 'none',
          background: 'rgba(0,0,0,0.35)',
          padding: '1px 6px',
          borderRadius: '3px',
          border: `1px solid ${color}33`,
        }}>
          {label}
          <div style={{ fontSize: '9px', color: `${color}99`, fontWeight: 'normal', marginTop: 1 }}>{subtitle}</div>
        </div>
      </Html>
    </group>
  )
}

// ============================================================
// Angle Arc with filled sector (Styling Improvement 3)
// ============================================================

function AngleArcWithSector({ center, dir1, dir2, radius: arcRadius, color, label, lineWidth = 3 }: {
  center: THREE.Vector3
  dir1: THREE.Vector3
  dir2: THREE.Vector3
  radius: number
  color: string
  label?: string
  lineWidth?: number
}) {
  const d1 = dir1.clone().normalize()
  const d2 = dir2.clone().normalize()
  const angle = Math.acos(Math.min(1, Math.max(-1, d1.dot(d2))))

  if (angle < 0.02 || angle > Math.PI - 0.02) return null

  const segments = 32
  const points: [number, number, number][] = []
  const rotAxis = new THREE.Vector3().crossVectors(d1, d2)
  if (rotAxis.length() < 1e-6) return null
  rotAxis.normalize()

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const theta = angle * t
    const dir = d1.clone().applyAxisAngle(rotAxis, theta)
    const point = center.clone().add(dir.multiplyScalar(arcRadius))
    points.push(point.toArray() as [number, number, number])
  }

  const midDir = d1.clone().applyAxisAngle(rotAxis, angle / 2).normalize()

  // Create filled sector geometry
  const sectorPositions: number[] = [center.x, center.y, center.z]
  const sectorIndices: number[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const theta = angle * t
    const dir = d1.clone().applyAxisAngle(rotAxis, theta)
    const point = center.clone().add(dir.multiplyScalar(arcRadius))
    sectorPositions.push(point.x, point.y, point.z)
  }
  for (let i = 0; i < segments; i++) {
    sectorIndices.push(0, i + 1, i + 2)
  }
  const sectorGeometry = new THREE.BufferGeometry()
  sectorGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sectorPositions, 3))
  sectorGeometry.setIndex(sectorIndices)
  sectorGeometry.computeVertexNormals()

  return (
    <group>
      {/* Filled semi-transparent sector */}
      <mesh geometry={sectorGeometry}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Arc line - thicker */}
      <Line points={points} color={color} lineWidth={lineWidth} />
      {label && (
        <Html
          position={center.clone().add(midDir.multiplyScalar(arcRadius * 1.4))}
          center
        >
          <div style={{
            color,
            fontSize: '12px',
            fontWeight: 'bold',
            fontFamily: 'serif',
            whiteSpace: 'nowrap',
            textShadow: '0 0 6px rgba(0,0,0,1)',
            pointerEvents: 'none',
            background: 'rgba(0,0,0,0.4)',
            padding: '1px 5px',
            borderRadius: '3px',
          }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  )
}

// ============================================================
// Cone with gradient effect (Styling Improvement 1)
// ============================================================

function AnimatedConeMesh({ vertex, baseCenter, axisDir, radius, height, color, targetOpacity, clippingPlanes }: {
  vertex: THREE.Vector3
  baseCenter: THREE.Vector3
  axisDir: THREE.Vector3
  radius: number
  height: number
  color: string
  targetOpacity: number
  clippingPlanes?: THREE.Plane[]
}) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const currentOpacity = useRef(0)

  useFrame(() => {
    if (!materialRef.current) return
    const target = targetOpacity
    const diff = target - currentOpacity.current
    // Spring-like interpolation: fast start, slow end
    const speed = Math.abs(diff) > 0.05 ? 0.08 : 0.03
    currentOpacity.current += diff * speed
    if (Math.abs(diff) < 0.001) currentOpacity.current = target
    materialRef.current.opacity = currentOpacity.current
  })

  if (radius < 0.01 || height < 0.01) return null

  const segments = 48
  const positions: number[] = []
  const indices: number[] = []
  const alphas: number[] = []

  positions.push(vertex.x, vertex.y, vertex.z)
  alphas.push(0.05) // vertex is nearly transparent

  const axis = axisDir.clone().normalize()
  let perp1 = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0))
  if (perp1.length() < 0.01) {
    perp1 = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(1, 0, 0))
  }
  perp1.normalize()
  const perp2 = new THREE.Vector3().crossVectors(axis, perp1).normalize()

  // Base ring
  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments
    const x = baseCenter.x + radius * (Math.cos(angle) * perp1.x + Math.sin(angle) * perp2.x)
    const y = baseCenter.y + radius * (Math.cos(angle) * perp1.y + Math.sin(angle) * perp2.y)
    const z = baseCenter.z + radius * (Math.cos(angle) * perp1.z + Math.sin(angle) * perp2.z)
    positions.push(x, y, z)
    alphas.push(1.0) // base is fully opaque (relative to material opacity)
  }

  // Vertex to base ring triangles
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments
    indices.push(0, i + 1, next + 1)
  }

  // Base cap
  const centerIdx = segments + 1
  positions.push(baseCenter.x, baseCenter.y, baseCenter.z)
  alphas.push(1.0)
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments
    indices.push(centerIdx, next + 1, i + 1)
  }

  // Mid ring for better gradient interpolation
  const midRatio = 0.5
  const midCenter = vertex.clone().lerp(baseCenter, midRatio)
  const midRadius = radius * midRatio
  const midIdxStart = segments + 2
  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments
    const x = midCenter.x + midRadius * (Math.cos(angle) * perp1.x + Math.sin(angle) * perp2.x)
    const y = midCenter.y + midRadius * (Math.cos(angle) * perp1.y + Math.sin(angle) * perp2.y)
    const z = midCenter.z + midRadius * (Math.cos(angle) * perp1.z + Math.sin(angle) * perp2.z)
    positions.push(x, y, z)
    alphas.push(0.5) // mid ring
  }
  // Vertex to mid ring
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments
    indices.push(0, midIdxStart + i, midIdxStart + next)
  }
  // Mid ring to base ring
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments
    indices.push(midIdxStart + i, i + 1, next + 1)
    indices.push(midIdxStart + i, next + 1, midIdxStart + next)
  }

  // Build vertex color attribute with alpha encoded in color
  const baseColorObj = new THREE.Color(color)
  const colorArray: number[] = []
  for (let i = 0; i < alphas.length; i++) {
    const a = alphas[i]
    // Encode alpha into color brightness: darker = more transparent
    colorArray.push(baseColorObj.r * a, baseColorObj.g * a, baseColorObj.b * a)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorArray, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        ref={materialRef}
        color="#ffffff"
        vertexColors
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        depthWrite={false}
        roughness={0.4}
        metalness={0.15}
        clippingPlanes={clippingPlanes}
        clipShadows
      />
    </mesh>
  )
}

function HypoidGearScene({ geo, steps, cameraView, rotateCones, meshingEnabled, compGeo, showComparison, showForceVectors, showCutaway, showConeGenerators, showNormals, onHoverPoint, onClickPoint, measureA, measureB, freeClickPoints, measureMode, onFreeClick, lang, onCameraUpdate, onFpsUpdate }: {
  geo: HypoidGeometry
  steps: boolean[]
  cameraView: string
  rotateCones: boolean
  meshingEnabled: boolean
  compGeo: HypoidGeometry
  showComparison: boolean
  showForceVectors: boolean
  showCutaway: boolean
  showConeGenerators: boolean
  showNormals: boolean
  onHoverPoint: (id: string | null) => void
  onClickPoint: (id: string) => void
  measureA: string | null
  measureB: string | null
  freeClickPoints: THREE.Vector3[]
  measureMode: boolean
  onFreeClick: (point: THREE.Vector3) => void
  lang: Lang
  onCameraUpdate?: (pos: THREE.Vector3) => void
  onFpsUpdate?: (fps: number) => void
}) {
  // Meshing rotation speed ratio
  const gearRatio = geo.R / Math.max(geo.Rp, 0.01)
  const smallSpeed = meshingEnabled ? 0.4 : (rotateCones ? 0.4 : 0)
  const largeSpeed = meshingEnabled ? 0.4 / gearRatio : (rotateCones ? 0.2 : 0)
  const enableRotation = rotateCones || meshingEnabled

  const smallToothCount = meshingEnabled ? 16 : 6
  const largeToothCount = meshingEnabled ? 24 : 10

  return (
    <group>
      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#fff5e6', '#1a1a3e', 0.4]} />
      <directionalLight position={[10, 10, 10]} intensity={0.8} />
      <directionalLight position={[-10, -5, -10]} intensity={0.3} />
      <directionalLight position={[0, -3, -10]} intensity={0.2} />
      <pointLight position={[0, 10, 0]} intensity={0.3} />

      <CameraController view={cameraView} onCameraUpdate={onCameraUpdate} onFpsUpdate={onFpsUpdate} />

      <Starfield count={400} />
      <FadingGrid />
      <GroundShadow />
      <GridReflection />
      <AmbientParticles count={80} />

      {/* Coordinate axes */}
      <group>
        <Line points={[[0,0,0], [3,0,0]] as [number, number, number][]} color="#ff4444" lineWidth={1} transparent opacity={0.3} />
        <Line points={[[0,0,0], [0,3,0]] as [number, number, number][]} color="#44ff44" lineWidth={1} transparent opacity={0.3} />
        <Line points={[[0,0,0], [0,0,3]] as [number, number, number][]} color="#4444ff" lineWidth={1} transparent opacity={0.3} />
        <AxisLabel position={[3.5, 0, 0]} text="X" color="#ff4444" />
        <AxisLabel position={[0, 3.5, 0]} text="Y" color="#44ff44" />
        <AxisLabel position={[0, 0, 3.5]} text="Z" color="#4444ff" />
      </group>

      {/* Step 1: Line K1K2 */}
      {steps[0] && (
        <group className="hypoid-step-fade-in">
          <AnimatedDashedLine start={geo.K1} end={geo.K2} color="#ffffff" />
          <PointSphere position={geo.K1} color="#c084fc" radius={0.15} label="K₁" labelOffset={[0.15, 0.25, 0]} pointId="K1" onHover={onHoverPoint} onClickPoint={onClickPoint} />
          <PointSphere position={geo.K2} color="#c084fc" radius={0.15} label="K₂" labelOffset={[0.15, 0.25, 0]} pointId="K2" onHover={onHoverPoint} onClickPoint={onClickPoint} />
        </group>
      )}

      {/* Step 2: Node point P */}
      {steps[1] && (
        <group className="hypoid-step-fade-in">
          <PulsingPoint position={geo.P} baseRadius={0.2} />
          <Html position={geo.P.clone().add(new THREE.Vector3(0.25, 0.35, 0))} center>
            <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: 'bold', fontFamily: 'serif', whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,0,0,1)', pointerEvents: 'none', background: 'rgba(0,0,0,0.35)', padding: '1px 6px', borderRadius: '3px', border: '1px solid #ef444433' }}>
              {t('label.P', lang)}
            </div>
          </Html>
          {steps[4] && (
            <RightAngleMarker
              point={geo.P}
              dir1={geo.K2.clone().sub(geo.K1).normalize()}
              dir2={new THREE.Vector3().crossVectors(
                geo.K2.clone().sub(geo.K1).normalize(),
                new THREE.Vector3(0, 1, 0)
              ).length() > 0.01
                ? new THREE.Vector3().crossVectors(geo.K2.clone().sub(geo.K1).normalize(), new THREE.Vector3(0, 1, 0)).normalize()
                : new THREE.Vector3(1, 0, 0)
              }
              size={0.6}
              color="#ef4444"
            />
          )}
        </group>
      )}

      {/* Step 3 & 4: Two skew axes with offset */}
      {steps[2] && (
        <group className="hypoid-step-fade-in">
          <AxisArrow start={geo.axisPStart} end={geo.axisPEnd} color="#f59e0b" />
          <AxisArrow start={geo.axisGStart} end={geo.axisGEnd} color="#10b981" />
          <Html position={geo.axisPEnd.clone().add(new THREE.Vector3(0.4, 0.4, 0))} center>
            <div style={{ color: '#f59e0b', fontSize: '15px', fontWeight: 'bold', fontFamily: 'serif', fontStyle: 'italic', whiteSpace: 'nowrap', textShadow: '0 0 8px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,0.5)', pointerEvents: 'none', background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '4px', border: '1px solid #f59e0b33' }}>
              {t('label.axisP', lang)}
            </div>
          </Html>
          <Html position={geo.axisGEnd.clone().add(new THREE.Vector3(0.4, 0.4, 0))} center>
            <div style={{ color: '#10b981', fontSize: '15px', fontWeight: 'bold', fontFamily: 'serif', fontStyle: 'italic', whiteSpace: 'nowrap', textShadow: '0 0 8px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,0.5)', pointerEvents: 'none', background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '4px', border: '1px solid #10b98133' }}>
              {t('label.axisG', lang)}
            </div>
          </Html>

          <PointSphere position={geo.O1} color="#94a3b8" radius={0.09} label="O₁" labelOffset={[0.15, -0.35, 0]} pointId="O1" onHover={onHoverPoint} onClickPoint={onClickPoint} />
          <PointSphere position={geo.O2} color="#94a3b8" radius={0.09} label="O₂" labelOffset={[0.15, -0.35, 0]} pointId="O2" onHover={onHoverPoint} onClickPoint={onClickPoint} />
          <OffsetLine O1={geo.O1} O2={geo.O2} />

          <RightAngleMarker point={geo.O1} dir1={geo.axisPDir} dir2={geo.O2.clone().sub(geo.O1).normalize()} size={0.4} color="#94a3b8" />
          <RightAngleMarker point={geo.O2} dir1={geo.axisGDir} dir2={geo.O1.clone().sub(geo.O2).normalize()} size={0.4} color="#94a3b8" />

          <DimensionLine start={geo.O1} end={geo.O2} color="#94a3b8" label="Eₚ" offset={[-0.5, 0.3, 0]} />
          <AngleArc center={geo.O2} dir1={geo.axisGDir} dir2={geo.axisPDir} radius={2.5} color="#e879f9" label={`Σ = ${(geo.Sigma * 180 / Math.PI).toFixed(0)}°`} />
        </group>
      )}

      {/* Step 5: Plane T */}
      {steps[4] && (
        <group className="hypoid-step-fade-in">
          <PlaneMesh corners={geo.planeTCorners} color="#3b82f6" opacity={0.06} />
          <PlaneBorder corners={geo.planeTCorners} color="#60a5fa" />
          <Html position={geo.P.clone().add(new THREE.Vector3(0, 3.5, 0))} center>
            <div style={{ color: '#60a5fa', fontSize: '14px', fontWeight: 'bold', fontFamily: 'serif', whiteSpace: 'nowrap', textShadow: '0 0 8px rgba(0,0,0,1)', pointerEvents: 'none', background: 'rgba(0,0,0,0.5)', padding: '2px 10px', borderRadius: '4px', border: '1px solid #3b82f633' }}>
              {t('label.planeT', lang)}
            </div>
          </Html>
          {steps[5] && <CrossSectionCircles geo={geo} />}
        </group>
      )}

      {/* Step 6: H1, H2 points */}
      {steps[5] && (
        <group className="hypoid-step-fade-in">
          <PointSphere position={geo.H1} color="#fbbf24" radius={0.16} label={lang === 'zh' ? 'H₁ 节锥顶点' : 'H₁ Pitch Cone Vertex'} labelOffset={[0.2, 0.3, 0]} pointId="H1" onHover={onHoverPoint} onClickPoint={onClickPoint} />
          <PointSphere position={geo.H2} color="#34d399" radius={0.16} label={lang === 'zh' ? 'H₂ 节锥顶点' : 'H₂ Pitch Cone Vertex'} labelOffset={[0.2, 0.3, 0]} pointId="H2" onHover={onHoverPoint} onClickPoint={onClickPoint} />
          {/* Dashed lines in step 6, solid in step 7 */}
          {!steps[6] ? (
            <>
              <Line points={[geo.H1.toArray() as [number, number, number], geo.P.toArray() as [number, number, number]]} color="#fbbf24" lineWidth={2.5} dashed dashSize={0.3} gapSize={0.15} />
              <Line points={[geo.H2.toArray() as [number, number, number], geo.P.toArray() as [number, number, number]]} color="#34d399" lineWidth={2.5} dashed dashSize={0.3} gapSize={0.15} />
            </>
          ) : (
            <>
              <Line points={[geo.H1.toArray() as [number, number, number], geo.P.toArray() as [number, number, number]]} color="#fbbf24" lineWidth={2.5} />
              <Line points={[geo.H2.toArray() as [number, number, number], geo.P.toArray() as [number, number, number]]} color="#34d399" lineWidth={2.5} />
            </>
          )}
          <DimensionLine start={geo.H1} end={geo.P} color="#fbbf24" label="|H₁P|" offset={[-0.5, 0.3, 0]} />
          <DimensionLine start={geo.H2} end={geo.P} color="#34d399" label="|H₂P|" offset={[0.5, 0.3, 0]} />
        </group>
      )}

      {/* Clipping plane for cutaway */}
      {(() => {
        // Define clipping plane: passes through the cone vertex and P, perpendicular to the pitch plane
        const cutNormal = new THREE.Vector3().crossVectors(
          geo.K2.clone().sub(geo.K1).normalize(),
          geo.P.clone().sub(geo.smallConeVertex).normalize()
        ).normalize()
        const clipPlane = new THREE.Plane()
        clipPlane.setFromNormalAndCoplanarPoint(cutNormal, geo.P)
        const clipPlanes = showCutaway ? [clipPlane] : []
        return (
          <>
            {/* Step 7: Pitch cones */}
            {steps[6] && (
              <group className="hypoid-step-fade-in">
                <RotatingGroup pivot={geo.smallConeVertex} axis={geo.axisPDir} speed={smallSpeed} enabled={enableRotation}>
                  <AnimatedConeMesh vertex={geo.smallConeVertex} baseCenter={geo.smallConeBaseCenter} axisDir={geo.axisPDir} radius={geo.smallConeRadius} height={geo.smallConeHeight} color="#f59e0b" targetOpacity={0.12} clippingPlanes={clipPlanes} />
                  <ConeWireframe vertex={geo.smallConeVertex} baseCenter={geo.smallConeBaseCenter} axisDir={geo.axisPDir} radius={geo.smallConeRadius} color="#f59e0b" />
                  <PitchCircle center={geo.smallConeBaseCenter} axisDir={geo.axisPDir} radius={geo.smallConeRadius} color="#fbbf24" />
                  <GlowRing center={geo.smallConeBaseCenter} axisDir={geo.axisPDir} radius={geo.smallConeRadius} color="#f59e0b" />
                  <GearToothMarkers center={geo.smallConeBaseCenter} axisDir={geo.axisPDir} radius={geo.smallConeRadius} color="#f59e0b" count={smallToothCount} />
                  <Line points={[geo.H1.toArray() as [number, number, number], geo.P.toArray() as [number, number, number]]} color="#fbbf24" lineWidth={3} />
                </RotatingGroup>
                <PointSphere position={geo.smallConeVertex} color="#f59e0b" radius={0.14} label="H₁(Vₚ)" labelOffset={[0.2, 0.3, 0]} pointId="Vp" onHover={onHoverPoint} onClickPoint={onClickPoint} />
                <AngleArcWithSector center={geo.smallConeVertex} dir1={geo.axisPDir} dir2={geo.P.clone().sub(geo.smallConeVertex).normalize()} radius={Math.min(2, geo.smallConeHeight * 0.4)} color="#fbbf24" label={`γ = ${(geo.gamma * 180 / Math.PI).toFixed(1)}°`} lineWidth={3} />

                <RotatingGroup pivot={geo.largeConeVertex} axis={geo.axisGDir} speed={largeSpeed} enabled={enableRotation}>
                  <AnimatedConeMesh vertex={geo.largeConeVertex} baseCenter={geo.largeConeBaseCenter} axisDir={geo.axisGDir} radius={geo.largeConeRadius} height={geo.largeConeHeight} color="#10b981" targetOpacity={0.12} clippingPlanes={clipPlanes} />
                  <ConeWireframe vertex={geo.largeConeVertex} baseCenter={geo.largeConeBaseCenter} axisDir={geo.axisGDir} radius={geo.largeConeRadius} color="#10b981" />
                  <PitchCircle center={geo.largeConeBaseCenter} axisDir={geo.axisGDir} radius={geo.largeConeRadius} color="#34d399" />
                  <GlowRing center={geo.largeConeBaseCenter} axisDir={geo.axisGDir} radius={geo.largeConeRadius} color="#10b981" />
                  <GearToothMarkers center={geo.largeConeBaseCenter} axisDir={geo.axisGDir} radius={geo.largeConeRadius} color="#10b981" count={largeToothCount} />
                  <Line points={[geo.H2.toArray() as [number, number, number], geo.P.toArray() as [number, number, number]]} color="#34d399" lineWidth={3} />
                </RotatingGroup>
                <PointSphere position={geo.largeConeVertex} color="#10b981" radius={0.14} label="H₂(Vg)" labelOffset={[0.2, 0.3, 0]} pointId="Vg" onHover={onHoverPoint} onClickPoint={onClickPoint} />
                <AngleArcWithSector center={geo.largeConeVertex} dir1={geo.axisGDir} dir2={geo.P.clone().sub(geo.largeConeVertex).normalize()} radius={Math.min(2, geo.largeConeHeight * 0.4)} color="#34d399" label={`Γ = ${(geo.Gamma * 180 / Math.PI).toFixed(1)}°`} lineWidth={3} />

                <DimensionLine start={geo.smallConeVertex} end={geo.largeConeVertex} color="#6366f1" label="|H₁H₂|" offset={[0, 0.5, 0]} />

                {/* Feature 2: Cone Axis Distance Indicators */}
                <DimensionLine start={geo.smallConeVertex} end={geo.smallConeBaseCenter} color="#f59e0b" label={`${t('dim.Ap', lang)} = ${geo.Ap.toFixed(2)}`} offset={[-0.8, 0.4, 0]} />
                <DimensionLine start={geo.largeConeVertex} end={geo.largeConeBaseCenter} color="#10b981" label={`${t('dim.A', lang)} = ${geo.A.toFixed(2)}`} offset={[0.8, 0.4, 0]} />

                {/* Feature 1: Cone Generator Lines */}
                {showConeGenerators && (
                  <>
                    <ConeGeneratorLines vertex={geo.smallConeVertex} baseCenter={geo.smallConeBaseCenter} axisDir={geo.axisPDir} radius={geo.smallConeRadius} color="#f59e0b" />
                    <ConeGeneratorLines vertex={geo.largeConeVertex} baseCenter={geo.largeConeBaseCenter} axisDir={geo.axisGDir} radius={geo.largeConeRadius} color="#10b981" />
                  </>
                )}

                {/* Feature 3: Enhanced Vertex Markers */}
                <EnhancedVertexMarker position={geo.smallConeVertex} color="#f59e0b" label="H₁(Vₚ)" subtitle={t('vertex.subtitle', lang)} />
                <EnhancedVertexMarker position={geo.largeConeVertex} color="#10b981" label="H₂(Vg)" subtitle={t('vertex.subtitle', lang)} />

                {/* Feature 4: Cone Surface Normal Vectors at P */}
                {showNormals && (
                  <ConeNormalVectors P={geo.P} H1={geo.H1} H2={geo.H2} axisPDir={geo.axisPDir} axisGDir={geo.axisGDir} lang={lang} />
                )}

                {/* Contact zone glow for meshing */}
                <ContactZoneGlow position={geo.P} enabled={meshingEnabled} />

                {/* Contact Ellipse - visible when meshing enabled and step 7 on */}
                {meshingEnabled && (
                  <ContactEllipse position={geo.P} axisDir={geo.axisGDir} semiA={0.4} semiB={0.2} />
                )}

                {/* Cone edge highlights */}
                <ConeEdgeHighlight vertex={geo.smallConeVertex} baseCenter={geo.smallConeBaseCenter} axisDir={geo.axisPDir} radius={geo.smallConeRadius} color="#f59e0b" />
                <ConeEdgeHighlight vertex={geo.largeConeVertex} baseCenter={geo.largeConeBaseCenter} axisDir={geo.axisGDir} radius={geo.largeConeRadius} color="#10b981" />

                {/* Helical tooth lines */}
                <HelicalToothLines vertex={geo.smallConeVertex} baseCenter={geo.smallConeBaseCenter} axisDir={geo.axisPDir} radius={geo.smallConeRadius} height={geo.smallConeHeight} spiralAngle={geo.epsilonPrime} color="#f59e0b" count={5} />
                <HelicalToothLines vertex={geo.largeConeVertex} baseCenter={geo.largeConeBaseCenter} axisDir={geo.axisGDir} radius={geo.largeConeRadius} height={geo.largeConeHeight} spiralAngle={geo.epsilon - geo.epsilonPrime} color="#10b981" count={5} />

                {/* Force Vector Arrows */}
                {showForceVectors && (
                  <ForceVectorArrows
                    position={geo.P}
                    axisP={geo.axisPDir}
                    axisG={geo.axisGDir}
                    K1K2Dir={geo.K2.clone().sub(geo.K1).normalize()}
                    lang={lang}
                  />
                )}
              </group>
            )}
          </>
        )
      })()}

      {/* Comparison overlay */}
      {showComparison && steps[6] && (
        <group>
          <ConeMesh vertex={compGeo.smallConeVertex} baseCenter={compGeo.smallConeBaseCenter} axisDir={compGeo.axisPDir} radius={compGeo.smallConeRadius} height={compGeo.smallConeHeight} color="#94a3b8" opacity={0.06} />
          <ConeWireframe vertex={compGeo.smallConeVertex} baseCenter={compGeo.smallConeBaseCenter} axisDir={compGeo.axisPDir} radius={compGeo.smallConeRadius} color="#94a3b8" />
          <ConeMesh vertex={compGeo.largeConeVertex} baseCenter={compGeo.largeConeBaseCenter} axisDir={compGeo.axisGDir} radius={compGeo.largeConeRadius} height={compGeo.largeConeHeight} color="#94a3b8" opacity={0.06} />
          <ConeWireframe vertex={compGeo.largeConeVertex} baseCenter={compGeo.largeConeBaseCenter} axisDir={compGeo.axisGDir} radius={compGeo.largeConeRadius} color="#94a3b8" />
          <Html position={compGeo.P.clone().add(new THREE.Vector3(0, -2, 0))} center>
            <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', fontFamily: 'serif', whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,0,0,1)', pointerEvents: 'none', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '4px', border: '1px solid #94a3b833' }}>
              {t('label.comparison', lang)}
            </div>
          </Html>
        </group>
      )}

      {/* Measurement line between A and B */}
      {measureA && measureB && (() => {
        const pointMap: Record<string, THREE.Vector3> = {
          P: geo.P, K1: geo.K1, K2: geo.K2, H1: geo.H1, H2: geo.H2, O1: geo.O1, O2: geo.O2, Vp: geo.smallConeVertex, Vg: geo.largeConeVertex,
        }
        const pA = pointMap[measureA] || (measureA.startsWith('free_') ? freeClickPoints[parseInt(measureA.replace('free_', ''))] : null)
        const pB = pointMap[measureB] || (measureB.startsWith('free_') ? freeClickPoints[parseInt(measureB.replace('free_', ''))] : null)
        if (!pA || !pB) return null
        const dist = pA.distanceTo(pB)
        const mid = pA.clone().add(pB).multiplyScalar(0.5)
        return (
          <group>
            <Line points={[pA.toArray() as [number, number, number], pB.toArray() as [number, number, number]]} color="#f59e0b" lineWidth={2} dashed dashSize={0.3} gapSize={0.15} />
            <Html position={mid.clone().add(new THREE.Vector3(0, 0.5, 0))} center>
              <div style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,0,0,1)', pointerEvents: 'none', background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: '4px', border: '1px solid #f59e0b44' }}>
                {measureA}→{measureB}: {dist.toFixed(3)}
              </div>
            </Html>
            <mesh position={pA}>
              <sphereGeometry args={[0.22, 16, 16]} />
              <meshBasicMaterial color="#f59e0b" transparent opacity={0.2} />
            </mesh>
            <mesh position={pB}>
              <sphereGeometry args={[0.22, 16, 16]} />
              <meshBasicMaterial color="#f59e0b" transparent opacity={0.2} />
            </mesh>
          </group>
        )
      })()}

      {/* Raycaster handler for free-click measurement */}
      <RaycasterHandler measureMode={measureMode} freeClickPoints={freeClickPoints} onFreeClick={onFreeClick} />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        rotateSpeed={0.8}
        minDistance={3}
        maxDistance={50}
      />
    </group>
  )
}

// ============================================================
// Numeric Input Component
// ============================================================

function NumericSlider({ label, value, onChange, min, max, step, color, unit = '', sliderClassName = '' }: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  color: string
  unit?: string
  sliderClassName?: string
}) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState(() => value.toFixed(step < 1 ? 1 : 0))

  const displayVal = value.toFixed(step < 1 ? 1 : 0)
  if (!editing && inputVal !== displayVal) {
    setInputVal(displayVal)
  }

  const handleInputChange = (v: string) => {
    setInputVal(v)
    const num = parseFloat(v)
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(num)
    }
  }

  const handleBlur = () => {
    setEditing(false)
    const num = parseFloat(inputVal)
    if (isNaN(num) || num < min || num > max) {
      setInputVal(value.toFixed(step < 1 ? 1 : 0))
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center text-sm mb-1.5">
        <Label className="text-[var(--hypoid-text-dim)] text-xs">{label}</Label>
        {editing ? (
          <Input
            value={inputVal}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') handleBlur() }}
            className="w-16 h-5 text-xs text-center bg-white/10 border-white/20 text-[var(--hypoid-text)] font-mono p-0 px-1"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className={`font-mono text-xs px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors cursor-text`}
            style={{ color }}
          >
            {value.toFixed(step < 1 ? 1 : 0)}{unit}
          </button>
        )}
      </div>
      <Slider
        value={[Math.round(value / step) * step]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className={`w-full ${sliderClassName}`}
      />
    </div>
  )
}

// ============================================================
// Tooltip wrapper for computed value cards
// ============================================================

function ValueCard({ children, tooltip, copyValue, copyLabel, onCopy }: {
  children: React.ReactNode
  tooltip: string
  copyValue?: string
  copyLabel?: string
  onCopy?: (value: string, label: string) => void
}) {
  const handleClick = useCallback(() => {
    if (copyValue && copyLabel && onCopy) {
      onCopy(copyValue, copyLabel)
    }
  }, [copyValue, copyLabel, onCopy])

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`hypoid-value-card ${copyValue ? 'hypoid-value-copyable' : 'cursor-help'}`} onClick={handleClick}>
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px] max-w-[200px]">
          {tooltip}
          {copyValue && <span className="ml-1 text-emerald-400">· 点击复制</span>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================
// Sparkline Mini Chart Component
// ============================================================

function SparklineMini({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 20
  const h = 12
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={w} height={h} style={{ opacity: 0.5, flexShrink: 0 }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ============================================================
// Mini 3D Compass Widget (Feature 3)
// ============================================================

function CompassWidget({ cameraPos }: { cameraPos: { x: number; y: number; z: number } }) {
  // Compute approximate camera rotation from position
  // The camera looks at (0,0,3), so we derive Euler angles from camera position
  const lookAt = new THREE.Vector3(0, 0, 3)
  const camPos = new THREE.Vector3(cameraPos.x, cameraPos.y, cameraPos.z)
  const forward = lookAt.clone().sub(camPos).normalize()
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()
  const up = new THREE.Vector3().crossVectors(right, forward).normalize()

  // Project axes onto screen (2D projection of 3D unit vectors)
  // For a simple CSS-based compass, we map X/Y/Z axes using the camera view matrix
  const projectAxis = (axis: THREE.Vector3) => {
    // Project 3D direction to 2D screen coordinates
    const x = axis.dot(right)
    const y = -axis.dot(up)
    return { x, y }
  }

  const xProj = projectAxis(new THREE.Vector3(1, 0, 0))
  const yProj = projectAxis(new THREE.Vector3(0, 1, 0))
  const zProj = projectAxis(new THREE.Vector3(0, 0, 1))

  const axisLen = 20

  return (
    <div className="hypoid-compass" title="3D Compass">
      {/* X axis - red */}
      <div
        className="hypoid-compass-axis"
        style={{
          background: '#ef4444',
          transform: `translate(-50%, 0) rotate(${Math.atan2(-xProj.y, xProj.x) * 180 / Math.PI}deg)`,
          height: `${axisLen}px`,
          opacity: Math.max(0.3, Math.abs(xProj.x) * 0.7 + 0.3),
        }}
      />
      <div
        className="hypoid-compass-label"
        style={{
          color: '#ef4444',
          left: `${30 + xProj.x * axisLen}px`,
          top: `${30 - xProj.y * axisLen}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        X
      </div>

      {/* Y axis - green */}
      <div
        className="hypoid-compass-axis"
        style={{
          background: '#22c55e',
          transform: `translate(-50%, 0) rotate(${Math.atan2(-yProj.y, yProj.x) * 180 / Math.PI}deg)`,
          height: `${axisLen}px`,
          opacity: Math.max(0.3, Math.abs(yProj.y) * 0.7 + 0.3),
        }}
      />
      <div
        className="hypoid-compass-label"
        style={{
          color: '#22c55e',
          left: `${30 + yProj.x * axisLen}px`,
          top: `${30 - yProj.y * axisLen}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        Y
      </div>

      {/* Z axis - blue */}
      <div
        className="hypoid-compass-axis"
        style={{
          background: '#6366f1',
          transform: `translate(-50%, 0) rotate(${Math.atan2(-zProj.y, zProj.x) * 180 / Math.PI}deg)`,
          height: `${axisLen}px`,
          opacity: Math.max(0.3, Math.abs(zProj.x) * 0.7 + 0.3),
        }}
      />
      <div
        className="hypoid-compass-label"
        style={{
          color: '#6366f1',
          left: `${30 + zProj.x * axisLen}px`,
          top: `${30 - zProj.y * axisLen}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        Z
      </div>

      {/* Center dot */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.3)',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  )
}

// ============================================================
// Expandable Section Component (with animation)
// ============================================================

function ExpandableSection({ label, open, onToggle, children, scrollContainerRef }: {
  label: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>
}) {
  const handleToggle = useCallback(() => {
    onToggle()
    // Auto-scroll to show expanded content after a short delay
    if (!open && scrollContainerRef?.current) {
      setTimeout(() => {
        scrollContainerRef.current?.scrollBy({ top: 100, behavior: 'smooth' })
      }, 350)
    }
  }, [onToggle, open, scrollContainerRef])

  return (
    <div>
      <button
        onClick={handleToggle}
        className="mt-2 text-[10px] text-[var(--hypoid-text-dim)] hover:text-[var(--hypoid-text)] transition-colors duration-200 w-full text-left flex items-center gap-1"
      >
        <span className="hypoid-toggle-arrow" data-open={open}>▸</span>
        {label}
      </button>
      <div
        className="hypoid-section-content"
        data-state={open ? 'expanded' : 'collapsed'}
      >
        {open && (
          <div className="hypoid-section-slide-in">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Main Page
// ============================================================

export default function Home() {
  const getUrlParams = () => {
    if (typeof window === 'undefined') return { sigma: 90, ep: 3, pRatio: 0.4 }
    try {
      const hash = window.location.hash.slice(1)
      if (!hash) return { sigma: 90, ep: 3, pRatio: 0.4 }
      const params = new URLSearchParams(hash)
      return {
        sigma: parseFloat(params.get('s') || '90'),
        ep: parseFloat(params.get('e') || '3'),
        pRatio: parseFloat(params.get('p') || '0.4'),
      }
    } catch {
      return { sigma: 90, ep: 3, pRatio: 0.4 }
    }
  }

  const [initialParams] = useState(getUrlParams)
  const [sigma, setSigma] = useState(initialParams.sigma)
  const [ep, setEp] = useState(initialParams.ep)
  const [pRatio, setPRatio] = useState(initialParams.pRatio)
  const [steps, setSteps] = useState([true, true, true, true, true, true, true])
  const [showAll, setShowAll] = useState(true)
  const [cameraView, setCameraView] = useState('iso')
  const [activeStep, setActiveStep] = useState(-1)
  const [showDerivedParams, setShowDerivedParams] = useState(false)
  const [rotateCones, setRotateCones] = useState(false)
  const [autoPlaying, setAutoPlaying] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [expandedStep, setExpandedStep] = useState<number | null>(null)
  const [showCrossSection, setShowCrossSection] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [sweepPlaying, setSweepPlaying] = useState(false)
  const [sweepParam, setSweepParam] = useState<'sigma' | 'ep'>('ep')
  const [copiedUrl, setCopiedUrl] = useState(false)
  // New feature states
  const [showEffectGraph, setShowEffectGraph] = useState(false)
  const [effectGraphMode, setEffectGraphMode] = useState<'ep' | 'sigma'>('ep')
  const [showFormulaDerivation, setShowFormulaDerivation] = useState(false)
  const [showConeUnroll, setShowConeUnroll] = useState(false)
  const [showPresetComparison, setShowPresetComparison] = useState(false)
  const [showInvoluteProfile, setShowInvoluteProfile] = useState(false)
  const [showGearRatioCalc, setShowGearRatioCalc] = useState(false)
  const [measureMode, setMeasureMode] = useState(false)
  const [measureA, setMeasureA] = useState<string | null>(null)
  const [measureB, setMeasureB] = useState<string | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'zh'
    try {
      const stored = localStorage.getItem('hypoid-language')
      if (stored === 'en' || stored === 'zh') return stored
    } catch {
      // ignore
    }
    return 'zh'
  })
  const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoPlayStep = useRef(0)
  const sweepTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sweepDirection = useRef(1)

  // Theme state
  const [theme, setTheme] = useState<ThemeName>(() => {
    if (typeof window === 'undefined') return 'midnight'
    try {
      const stored = localStorage.getItem('hypoid-theme')
      if (stored === 'midnight' || stored === 'ocean' || stored === 'paper') return stored
    } catch {
      // ignore
    }
    return 'midnight'
  })

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Sensitivity heatmap state
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [heatmapMode, setHeatmapMode] = useState<'gamma' | 'Gamma'>('gamma')

  // Meshing simulation state
  const [meshingEnabled, setMeshingEnabled] = useState(false)

  // Free-click measurement state
  const [freeClickPoints, setFreeClickPoints] = useState<THREE.Vector3[]>([])

  // Sparkline history tracking
  const [gammaHistory, setGammaHistory] = useState<number[]>([])
  const [gamma2History, setGamma2History] = useState<number[]>([])
  const [paramHistoryFull, setParamHistoryFull] = useState<{ gamma: number; Gamma: number }[]>([])
  const [historyTooltipIdx, setHistoryTooltipIdx] = useState<number | null>(null)

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  // Tolerance analysis state
  const [showTolerance, setShowTolerance] = useState(false)

  // Parameter history state
  const [showParamHistory, setShowParamHistory] = useState(false)

  // Loading splash state
  const [sceneLoading, setSceneLoading] = useState(true)

  // SVG export state
  const [svgExported, setSvgExported] = useState(false)

  // Report generated toast state
  const [reportGenerated, setReportGenerated] = useState(false)

  // Force vectors state
  const [showForceVectors, setShowForceVectors] = useState(false)

  // Cone cutaway state
  const [showCutaway, setShowCutaway] = useState(false)

  // Assembly diagram state
  const [showAssembly, setShowAssembly] = useState(false)

  // Cone generator lines state (Feature 1)
  const [showConeGenerators, setShowConeGenerators] = useState(false)

  // Cone surface normals state (Feature 4)
  const [showNormals, setShowNormals] = useState(false)

  // Copy-to-clipboard feedback
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  // Parameter comparison state
  const [showParamCompare, setShowParamCompare] = useState(false)
  const [compareSigma, setCompareSigma] = useState(90)
  const [compareEp, setCompareEp] = useState(3)
  const [comparePRatio, setComparePRatio] = useState(0.4)
  const [compareBlend, setCompareBlend] = useState(0)

  // Panel scroll state
  const [panelScrolled, setPanelScrolled] = useState(false)
  const panelScrollRef = useRef<HTMLDivElement | null>(null)

  // Camera position tracking
  const [cameraPos, setCameraPos] = useState({ x: 12, y: 8, z: 10 })
  const [fps, setFps] = useState(0)
  const handleCameraUpdate = useCallback((pos: THREE.Vector3) => {
    setCameraPos({ x: pos.x, y: pos.y, z: pos.z })
  }, [])
  const handleFpsUpdate = useCallback((newFps: number) => {
    setFps(newFps)
  }, [])
  // Screenshot state
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [screenshotDone, setScreenshotDone] = useState(false)

  // Undo/Redo state
  const MAX_HISTORY = 50
  const [historyStack, setHistoryStack] = useState<{ sigma: number; ep: number; pRatio: number }[]>(() => [{ sigma, ep, pRatio }])
  const [historyIdx, setHistoryIdx] = useState(0)
  const isUndoRedoAction = useRef(false)
  const prevParamsRef = useRef({ sigma, ep, pRatio })

  // Track parameter changes for undo/redo
  useEffect(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false
      prevParamsRef.current = { sigma, ep, pRatio }
      return
    }
    const prev = prevParamsRef.current
    if (prev.sigma !== sigma || prev.ep !== ep || prev.pRatio !== pRatio) {
      prevParamsRef.current = { sigma, ep, pRatio }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- History tracking requires state update on param change
      setHistoryStack(prevStack => {
        if (prevStack.length > 0) {
          const last = prevStack[prevStack.length - 1]
          if (last.sigma === sigma && last.ep === ep && last.pRatio === pRatio) {
            return prevStack
          }
        }
        const newStack = prevStack.slice(0, historyIdx + 1)
        newStack.push({ sigma, ep, pRatio })
        if (newStack.length > MAX_HISTORY) {
          newStack.shift()
          setHistoryIdx(historyIdx)
        } else {
          setHistoryIdx(historyIdx + 1)
        }
        return newStack
      })
    }
  }, [sigma, ep, pRatio, historyIdx, MAX_HISTORY])

  const canUndo = historyIdx > 0
  const canRedo = historyIdx < historyStack.length - 1

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Help modal state
  const [showHelp, setShowHelp] = useState(false)

  const handleUndo = useCallback(() => {
    if (historyIdx <= 0) return
    const newIdx = historyIdx - 1
    setHistoryIdx(newIdx)
    const prev = historyStack[newIdx]
    isUndoRedoAction.current = true
    setSigma(prev.sigma)
    setEp(prev.ep)
    setPRatio(prev.pRatio)
  }, [historyIdx, historyStack])

  const handleRedo = useCallback(() => {
    if (historyIdx >= historyStack.length - 1) return
    const newIdx = historyIdx + 1
    setHistoryIdx(newIdx)
    const next = historyStack[newIdx]
    isUndoRedoAction.current = true
    setSigma(next.sigma)
    setEp(next.ep)
    setPRatio(next.pRatio)
  }, [historyIdx, historyStack])

  // Screenshot handler
  const handleScreenshot = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `hypoid-gear-Σ${sigma}-Ep${ep.toFixed(1)}.png`
      link.href = dataUrl
      link.click()
      setScreenshotDone(true)
      setTimeout(() => setScreenshotDone(false), 2000)
    } catch {
      // Canvas tainted or unavailable
    }
  }, [sigma, ep])

  // SVG export handler
  // Report generation handler (computes geometry inline)
  const handleReport = useCallback(() => {
    try {
      const rGeo = computeHypoidGeometry(sigma, ep, pRatio)
      const rGammaDeg = (rGeo.gamma * 180 / Math.PI).toFixed(2)
      const rGammaDegLarge = (rGeo.Gamma * 180 / Math.PI).toFixed(2)
      const rEtaDeg = (rGeo.eta * 180 / Math.PI).toFixed(2)
      const rEpsilonDeg = (rGeo.epsilon * 180 / Math.PI).toFixed(2)
      const rEpsilonPrimeDeg = (rGeo.epsilonPrime * 180 / Math.PI).toFixed(2)
      const now = new Date().toLocaleString()

      // Build SVG for the cross-section
      const svgW = 400
      const svgH = 300
      const scx = svgW / 2
      const scy = svgH / 2
      const sCx = scx - (rGeo.H1.x - rGeo.H2.x) * 12
      const sCy = scy - (rGeo.H1.z - rGeo.H2.z) * 12
      const lCx = scx
      const lCy = scy
      const sR = Math.min(rGeo.Rp * 12, 80)
      const lR = Math.min(rGeo.R * 12, 90)
      const pCx = scx - (rGeo.H2.x - rGeo.P.x) * 12
      const pCy = scy - (rGeo.H2.z - rGeo.P.z) * 12

      const svgSection = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}">
  <rect width="${svgW}" height="${svgH}" fill="#f8f8f8" rx="8"/>
  <line x1="${scx}" y1="20" x2="${scx}" y2="${svgH - 20}" stroke="#ddd" stroke-width="0.5"/>
  <line x1="20" y1="${scy}" x2="${svgW - 20}" y2="${scy}" stroke="#ddd" stroke-width="0.5"/>
  <circle cx="${sCx}" cy="${sCy}" r="${sR}" fill="none" stroke="#d97706" stroke-width="1.5" stroke-dasharray="4 2" opacity="0.7"/>
  <circle cx="${lCx}" cy="${lCy}" r="${lR}" fill="none" stroke="#059669" stroke-width="1.5" stroke-dasharray="4 2" opacity="0.7"/>
  <circle cx="${pCx}" cy="${pCy}" r="4" fill="#dc2626" opacity="0.9"/>
  <circle cx="${sCx}" cy="${sCy}" r="3" fill="#d97706" opacity="0.8"/>
  <circle cx="${lCx}" cy="${lCy}" r="3" fill="#059669" opacity="0.8"/>
  <text x="${pCx + 8}" y="${pCy - 4}" fill="#dc2626" font-size="9" font-family="serif">P</text>
  <text x="${sCx + 8}" y="${sCy - 4}" fill="#d97706" font-size="9" font-family="serif">H₁</text>
  <text x="${lCx + 8}" y="${lCy - 4}" fill="#059669" font-size="9" font-family="serif">H₂</text>
</svg>`

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Hypoid Gear Report</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #222; background: #fff; }
  h1 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 8px; }
  h2 { font-size: 16px; margin-top: 24px; color: #444; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; font-size: 13px; }
  th { background: #f0f0f0; font-weight: 600; }
  .formulas { background: #f8f8f8; padding: 12px; border-radius: 6px; border: 1px solid #ddd; font-family: monospace; font-size: 13px; line-height: 1.8; }
  .timestamp { color: #888; font-size: 11px; margin-top: 24px; border-top: 1px solid #ddd; padding-top: 8px; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>准双曲面齿轮节锥几何参数报告<br/><span style="font-size:14px;color:#666">Hypoid Gear Pitch Cone Geometry Report</span></h1>
<h2>参数表 / Parameter Table</h2>
<table>
  <tr><th>参数</th><th>符号</th><th>值</th><th>单位</th></tr>
  <tr><td>轴夹角</td><td>Σ</td><td>${sigma}</td><td>°</td></tr>
  <tr><td>偏置距</td><td>Eₚ</td><td>${ep.toFixed(1)}</td><td></td></tr>
  <tr><td>节点位置</td><td>P</td><td>${pRatio.toFixed(2)}</td><td></td></tr>
  <tr><td>小轮节锥角</td><td>γ</td><td>${rGammaDeg}</td><td>°</td></tr>
  <tr><td>大轮节锥角</td><td>Γ</td><td>${rGammaDegLarge}</td><td>°</td></tr>
  <tr><td>小轮偏置角</td><td>η</td><td>${rEtaDeg}</td><td>°</td></tr>
  <tr><td>大轮偏置角</td><td>ε</td><td>${rEpsilonDeg}</td><td>°</td></tr>
  <tr><td>偏置角</td><td>ε'</td><td>${rEpsilonPrimeDeg}</td><td>°</td></tr>
  <tr><td>小轮节圆半径</td><td>Rₚ</td><td>${rGeo.Rp.toFixed(3)}</td><td></td></tr>
  <tr><td>大轮节圆半径</td><td>R</td><td>${rGeo.R.toFixed(3)}</td><td></td></tr>
  <tr><td>小轮节锥距</td><td>Aₚ</td><td>${rGeo.Ap.toFixed(3)}</td><td></td></tr>
  <tr><td>大轮节锥距</td><td>A</td><td>${rGeo.A.toFixed(3)}</td><td></td></tr>
  <tr><td>小轮母线</td><td>|H₁P|</td><td>${rGeo.H1.distanceTo(rGeo.P).toFixed(3)}</td><td></td></tr>
  <tr><td>大轮母线</td><td>|H₂P|</td><td>${rGeo.H2.distanceTo(rGeo.P).toFixed(3)}</td><td></td></tr>
  <tr><td>小轮轴向距离</td><td>Zₚ</td><td>${rGeo.Zp.toFixed(3)}</td><td></td></tr>
  <tr><td>轴向距离</td><td>Z</td><td>${rGeo.Z.toFixed(3)}</td><td></td></tr>
  <tr><td>大轮轴向距离</td><td>Zg</td><td>${rGeo.Zg.toFixed(3)}</td><td></td></tr>
  <tr><td>大轮节锥距</td><td>G</td><td>${rGeo.G.toFixed(3)}</td><td></td></tr>
</table>
<h2>关键公式 / Key Formulas</h2>
<div class="formulas">
  tan η = Eₚ / (Q·sin Σ)<br/>
  sin ε = (Eₚ - Rₚ·sin η) / R<br/>
  tan Γ = sin ε/(tan η·sin Σ) - cos ε·cot Σ<br/>
  tan γ = sin η/(tan ε·sin Σ) - cos η·cot Σ<br/>
  sin ε' = sin Σ·sin ε / cos γ
</div>
<h2>截面图 / Cross-Section Diagram</h2>
${svgSection}
<div class="timestamp">生成时间 / Generated: ${now}</div>
</body></html>`

      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html)
        win.document.close()
        setReportGenerated(true)
        setTimeout(() => setReportGenerated(false), 2000)
      }
    } catch {
      // Report generation failed
    }
  }, [sigma, ep, pRatio])

  // Copy value to clipboard handler
  const handleCopyValue = useCallback((value: string, label: string) => {
    try {
      navigator.clipboard.writeText(value)
      setCopiedValue(label)
      setTimeout(() => setCopiedValue(null), 1500)
    } catch {
      // Clipboard API unavailable
    }
  }, [])

  const handleSvgExport = useCallback(() => {
    try {
      // Compute geometry inline to avoid referencing variables not yet declared
      const currentGeo = computeHypoidGeometry(sigma, ep, pRatio)
      const currentGammaDeg = (currentGeo.gamma * 180 / Math.PI).toFixed(1)
      const currentGammaDegLarge = (currentGeo.Gamma * 180 / Math.PI).toFixed(1)

      const svgW = 400
      const svgH = 300
      const cx = svgW / 2
      const cy = svgH / 2

      // Compute positions for the cross section SVG
      const smallCx = cx - (currentGeo.smallConeBaseCenter.x - currentGeo.largeConeBaseCenter.x) * 12
      const smallCy = cy - (currentGeo.smallConeBaseCenter.z - currentGeo.largeConeBaseCenter.z) * 12
      const largeCx = cx
      const largeCy = cy
      const pCx = cx - (currentGeo.H2.x - currentGeo.P.x) * 12
      const pCy = cy - (currentGeo.H2.z - currentGeo.P.z) * 12

      const smallR = Math.min(currentGeo.Rp * 12, 80)
      const largeR = Math.min(currentGeo.R * 12, 90)

      const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}">
  <rect width="${svgW}" height="${svgH}" fill="#1a1a2e" rx="8"/>
  <line x1="${cx}" y1="20" x2="${cx}" y2="${svgH - 20}" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>
  <line x1="20" y1="${cy}" x2="${svgW - 20}" y2="${cy}" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>
  <text x="${cx}" y="18" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="11" font-family="serif" font-weight="bold">Hypoid Gear Cross Section — Σ=${sigma}° Eₚ=${ep.toFixed(1)} P=${pRatio.toFixed(2)}</text>
  <circle cx="${smallCx}" cy="${smallCy}" r="${smallR}" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="4 2" opacity="0.7"/>
  <circle cx="${largeCx}" cy="${largeCy}" r="${largeR}" fill="none" stroke="#34d399" stroke-width="1.5" stroke-dasharray="4 2" opacity="0.7"/>
  <circle cx="${pCx}" cy="${pCy}" r="4" fill="#ef4444" opacity="0.9"/>
  <circle cx="${smallCx}" cy="${smallCy}" r="2" fill="#f59e0b" opacity="0.6"/>
  <circle cx="${largeCx}" cy="${largeCy}" r="2" fill="#10b981" opacity="0.6"/>
  <text x="${pCx + 8}" y="${pCy - 4}" fill="#ef4444" font-size="9" font-family="serif">P (${currentGeo.P.x.toFixed(1)}, ${currentGeo.P.z.toFixed(1)})</text>
  <text x="${smallCx + 8}" y="${smallCy - 4}" fill="#f59e0b" font-size="9" font-family="serif">H₁(Vₚ)</text>
  <text x="${largeCx + 8}" y="${largeCy - 4}" fill="#10b981" font-size="9" font-family="serif">H₂(Vg)</text>
  <text x="15" y="${svgH - 30}" fill="#fbbf24" font-size="9" font-family="monospace" opacity="0.7">Rₚ = ${currentGeo.Rp.toFixed(2)}</text>
  <text x="15" y="${svgH - 18}" fill="#34d399" font-size="9" font-family="monospace" opacity="0.7">R = ${currentGeo.R.toFixed(2)}</text>
  <text x="15" y="${svgH - 6}" fill="rgba(255,255,255,0.4)" font-size="8" font-family="monospace">γ = ${currentGammaDeg}° Γ = ${currentGammaDegLarge}°</text>
  <text x="${svgW - 15}" y="${svgH - 6}" text-anchor="end" fill="rgba(255,255,255,0.3)" font-size="7" font-family="monospace">T plane</text>
</svg>`

      const blob = new Blob([svgContent], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `hypoid-cross-section-Σ${sigma}-Ep${ep.toFixed(1)}.svg`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
      setSvgExported(true)
      setTimeout(() => setSvgExported(false), 2000)
    } catch {
      // SVG generation failed
    }
  }, [sigma, ep, pRatio])

  // Video recording handler
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      setIsRecording(false)
      return
    }
    // Start recording
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const stream = canvas.captureStream(30)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      })
      recordedChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data)
        }
      }
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = `hypoid-gear-Σ${sigma}-Ep${ep.toFixed(1)}.webm`
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
        recordedChunksRef.current = []
      }
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100)
      setIsRecording(true)
    } catch {
      // MediaRecorder not supported or canvas unavailable
    }
  }, [isRecording, sigma, ep])

  // Fullscreen handler
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev)
  }, [])

  // Track mouse for hover tooltip
  useEffect(() => {
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  const geo = useMemo(() => computeHypoidGeometry(sigma, ep, pRatio), [sigma, ep, pRatio])
  const compGeo = useMemo(() => computeHypoidGeometry(sigma, 0.01, pRatio), [sigma, pRatio])

  // Parameter comparison geometry (for the blend slider)
  const compareGeo = useMemo(() => computeHypoidGeometry(compareSigma, compareEp, comparePRatio), [compareSigma, compareEp, comparePRatio])

  // Blended geometry for comparison visualization
  const blendedGeo = useMemo(() => {
    if (compareBlend <= 0) return geo
    if (compareBlend >= 1) return compareGeo
    // Simple approach: compute for interpolated params
    const bSigma = sigma + (compareSigma - sigma) * compareBlend
    const bEp = ep + (compareEp - ep) * compareBlend
    const bP = pRatio + (comparePRatio - pRatio) * compareBlend
    return computeHypoidGeometry(bSigma, bEp, bP)
  }, [geo, compareGeo, compareBlend, sigma, ep, pRatio, compareSigma, compareEp, comparePRatio])

  const stepNames = [
    t('step.0', lang), t('step.1', lang), t('step.2', lang),
    t('step.3', lang), t('step.4', lang), t('step.5', lang), t('step.6', lang),
  ]

  const stepDescriptions = [
    t('stepDesc.0', lang), t('stepDesc.1', lang), t('stepDesc.2', lang),
    t('stepDesc.3', lang), t('stepDesc.4', lang), t('stepDesc.5', lang), t('stepDesc.6', lang),
  ]

  const stepDetailedDescriptions = [
    t('stepDetail.0', lang), t('stepDetail.1', lang), t('stepDetail.2', lang),
    t('stepDetail.3', lang), t('stepDetail.4', lang), t('stepDetail.5', lang), t('stepDetail.6', lang),
  ]

  const toggleStep = useCallback((index: number) => {
    setSteps(prev => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setShowAll(prev => !prev)
    setSteps(new Array(7).fill(!showAll))
  }, [showAll])

  const playStepByStep = useCallback(() => {
    setActiveStep(prev => {
      const next = prev + 1
      if (next >= 7) {
        setSteps(new Array(7).fill(true))
        return -1
      }
      const newSteps = new Array(7).fill(false)
      for (let i = 0; i <= next; i++) {
        newSteps[i] = true
      }
      setSteps(newSteps)
      return next
    })
  }, [])

  const startAutoPlay = useCallback(() => {
    if (autoPlaying) {
      setAutoPlaying(false)
      if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current)
      return
    }
    setAutoPlaying(true)
    autoPlayStep.current = 0
    const newSteps = new Array(7).fill(false)
    newSteps[0] = true
    setSteps(newSteps)
    setActiveStep(0)

    const tick = () => {
      autoPlayStep.current++
      if (autoPlayStep.current >= 7) {
        setAutoPlaying(false)
        setSteps(new Array(7).fill(true))
        setActiveStep(-1)
        return
      }
      setSteps(prev => {
        const next = [...prev]
        next[autoPlayStep.current] = true
        return next
      })
      setActiveStep(autoPlayStep.current)
      autoPlayTimer.current = setTimeout(tick, 1200)
    }
    autoPlayTimer.current = setTimeout(tick, 1200)
  }, [autoPlaying])

  useEffect(() => {
    return () => {
      if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current)
      if (sweepTimer.current) clearTimeout(sweepTimer.current)
    }
  }, [])

  const presets = useMemo(() => [
    { name: t('preset.standard', lang), sigma: 90, ep: 3, pRatio: 0.4, desc: t('preset.standard.desc', lang) },
    { name: t('preset.automotive', lang), sigma: 90, ep: 4.5, pRatio: 0.35, desc: t('preset.automotive.desc', lang) },
    { name: t('preset.smallOffset', lang), sigma: 90, ep: 1.5, pRatio: 0.5, desc: t('preset.smallOffset.desc', lang) },
    { name: t('preset.nonOrthogonal', lang), sigma: 120, ep: 3, pRatio: 0.4, desc: t('preset.nonOrthogonal.desc', lang) },
    { name: t('preset.heavyDuty', lang), sigma: 90, ep: 6, pRatio: 0.3, desc: t('preset.heavyDuty.desc', lang) },
  ], [lang])

  const applyPreset = useCallback((p: typeof presets[0]) => {
    setSigma(p.sigma)
    setEp(Math.round(p.ep * 10) / 10)
    setPRatio(Math.round(p.pRatio * 100) / 100)
  }, [])

  const shareUrl = useCallback(() => {
    const params = new URLSearchParams({
      s: sigma.toString(),
      e: ep.toFixed(1),
      p: pRatio.toFixed(2),
    })
    const url = `${window.location.origin}${window.location.pathname}#${params.toString()}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    }).catch(() => {
      window.location.hash = params.toString()
    })
  }, [sigma, ep, pRatio])

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        s: sigma.toString(),
        e: ep.toFixed(1),
        p: pRatio.toFixed(2),
      })
      window.history.replaceState(null, '', `#${params.toString()}`)
    }, 500)
    return () => clearTimeout(timer)
  }, [sigma, ep, pRatio])

  const toggleSweep = useCallback(() => {
    if (sweepPlaying) {
      setSweepPlaying(false)
      if (sweepTimer.current) clearTimeout(sweepTimer.current)
      return
    }
    setSweepPlaying(true)
    sweepDirection.current = 1

    const tick = () => {
      if (sweepParam === 'ep') {
        setEp(prev => {
          let next = prev + sweepDirection.current * 0.2
          if (next >= 7.8) { sweepDirection.current = -1; next = 7.8 }
          if (next <= 0.7) { sweepDirection.current = 1; next = 0.7 }
          return Math.round(next * 10) / 10
        })
      } else {
        setSigma(prev => {
          let next = prev + sweepDirection.current * 2
          if (next >= 148) { sweepDirection.current = -1; next = 148 }
          if (next <= 32) { sweepDirection.current = 1; next = 32 }
          return next
        })
      }
      sweepTimer.current = setTimeout(tick, 150)
    }
    sweepTimer.current = setTimeout(tick, 150)
  }, [sweepPlaying, sweepParam])

  const resetDefaults = useCallback(() => {
    setSigma(90)
    setEp(3)
    setPRatio(0.4)
    setSteps(new Array(7).fill(true))
    setShowAll(true)
    setActiveStep(-1)
    setCameraView('iso')
    setAutoPlaying(false)
    setRotateCones(false)
    setShowDerivedParams(false)
    setShowComparison(false)
    setSweepPlaying(false)
    setShowEffectGraph(false)
    setShowFormulaDerivation(false)
    setShowConeUnroll(false)
    setShowPresetComparison(false)
    setShowInvoluteProfile(false)
    setShowGearRatioCalc(false)
    setMeasureMode(false)
    setMeasureA(null)
    setMeasureB(null)
    setIsFullscreen(false)
    setMeshingEnabled(false)
    setShowHeatmap(false)
    setFreeClickPoints([])
    setShowTolerance(false)
    setShowParamHistory(false)
    setShowParamCompare(false)
    setCompareBlend(0)
    setShowForceVectors(false)
    setShowCutaway(false)
    setShowAssembly(false)
    setShowConeGenerators(false)
    setShowNormals(false)
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      setIsRecording(false)
    }
    if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current)
    if (sweepTimer.current) clearTimeout(sweepTimer.current)
  }, [isRecording])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        handleRedo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Z') {
        e.preventDefault()
        handleRedo()
        return
      }
      switch (e.key) {
        case 'r': case 'R':
          setRotateCones(prev => !prev)
          break
        case ' ':
          e.preventDefault()
          playStepByStep()
          break
        case 'a': case 'A':
          startAutoPlay()
          break
        case 'c': case 'C':
          setShowComparison(prev => !prev)
          break
        case 'f': case 'F':
          toggleFullscreen()
          break
        case 'Escape':
          if (isFullscreen) {
            setIsFullscreen(false)
          } else if (showHelp) {
            setShowHelp(false)
          } else {
            resetDefaults()
          }
          break
        case '1': setCameraView('iso' + Date.now()); break
        case '2': setCameraView('front' + Date.now()); break
        case '3': setCameraView('side' + Date.now()); break
        case '4': setCameraView('top' + Date.now()); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [playStepByStep, startAutoPlay, resetDefaults, handleUndo, handleRedo, toggleFullscreen, isFullscreen, showHelp])

  // Timeline step click handler
  const handleTimelineStepClick = useCallback((stepIndex: number) => {
    setSteps(prev => {
      const next = [...prev]
      next[stepIndex] = !next[stepIndex]
      return next
    })
    setActiveStep(stepIndex)
  }, [])

  // Save/Load handler
  const handleLoadSaved = useCallback((s: number, e: number, p: number) => {
    setSigma(s)
    setEp(e)
    setPRatio(p)
  }, [])

  const gammaDeg = (geo.gamma * 180 / Math.PI).toFixed(1)
  const GammaDeg = (geo.Gamma * 180 / Math.PI).toFixed(1)
  const etaDeg = (geo.eta * 180 / Math.PI).toFixed(1)
  const epsilonDeg = (geo.epsilon * 180 / Math.PI).toFixed(1)
  const epsilonPrimeDeg = (geo.epsilonPrime * 180 / Math.PI).toFixed(1)

  // Value flash detection and sparkline history
  useEffect(() => {
    const gVal = parseFloat(gammaDeg)
    if (!isNaN(gVal)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Sparkline history tracking
      setGammaHistory(prev => [...prev.slice(-9), gVal])
      setParamHistoryFull(prev => [...prev.slice(-49), { gamma: gVal, Gamma: parseFloat(GammaDeg) }])
    }
  }, [gammaDeg, GammaDeg])

  useEffect(() => {
    const g2Val = parseFloat(GammaDeg)
    if (!isNaN(g2Val)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Sparkline history tracking
      setGamma2History(prev => [...prev.slice(-9), g2Val])
    }
  }, [GammaDeg])

  // Measurement handlers
  const handleMeasureClick = useCallback((pointId: string) => {
    if (!measureMode) return
    if (!measureA) {
      setMeasureA(pointId)
      setMeasureB(null)
    } else if (!measureB) {
      if (pointId !== measureA) {
        setMeasureB(pointId)
      }
    } else {
      setMeasureA(pointId)
      setMeasureB(null)
    }
  }, [measureMode, measureA, measureB])

  // Free-click measurement handler
  const handleFreeClick = useCallback((point: THREE.Vector3) => {
    if (!measureMode) return
    const freeIdx = freeClickPoints.length
    setFreeClickPoints(prev => [...prev, point])
    const freeId = `free_${freeIdx}`
    if (!measureA) {
      setMeasureA(freeId)
      setMeasureB(null)
    } else if (!measureB) {
      if (freeId !== measureA) {
        setMeasureB(freeId)
      }
    } else {
      setMeasureA(freeId)
      setMeasureB(null)
    }
  }, [measureMode, measureA, measureB, freeClickPoints.length])

  const handleHoverPoint = useCallback((id: string | null) => {
    setHoveredPoint(id)
  }, [])

  const clearMeasurement = useCallback(() => {
    setMeasureA(null)
    setMeasureB(null)
    setFreeClickPoints([])
  }, [])

  const toggleLanguage = useCallback(() => {
    setLang(prev => {
      const next = prev === 'zh' ? 'en' : 'zh'
      setStoredLang(next)
      return next
    })
  }, [])

  // Theme toggle handler
  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const themes: ThemeName[] = ['midnight', 'ocean', 'paper']
      const idx = themes.indexOf(prev)
      const next = themes[(idx + 1) % themes.length]
      setStoredTheme(next)
      return next
    })
  }, [])

  // Heatmap param setter
  const handleHeatmapSetParams = useCallback((newSigma: number, newEp: number) => {
    setSigma(newSigma)
    setEp(newEp)
  }, [])

  // Point info for hover tooltip
  const pointInfoMap: Record<string, { name: string; pos: THREE.Vector3; extra?: string }> = {
    P: { name: t('label.P', lang), pos: geo.P },
    K1: { name: 'K₁', pos: geo.K1 },
    K2: { name: 'K₂', pos: geo.K2 },
    H1: { name: 'H₁', pos: geo.H1, extra: `|H₁P| = ${geo.H1.distanceTo(geo.P).toFixed(3)}` },
    H2: { name: 'H₂', pos: geo.H2, extra: `|H₂P| = ${geo.H2.distanceTo(geo.P).toFixed(3)}` },
    O1: { name: 'O₁', pos: geo.O1 },
    O2: { name: 'O₂', pos: geo.O2 },
    Vp: { name: 'H₁(Vₚ)', pos: geo.smallConeVertex },
    Vg: { name: 'H₂(Vg)', pos: geo.largeConeVertex },
  }

  const themeColors: Record<ThemeName, string> = {
    midnight: '#0d0d14',
    ocean: '#0a1628',
    paper: '#f8f7f4',
  }

  const isPaper = theme === 'paper'
  const textMainClass = isPaper ? 'text-gray-900' : 'text-white'

  // Get measurement distance
  const getMeasureDistance = useCallback(() => {
    if (!measureA || !measureB) return null
    const pointMap: Record<string, THREE.Vector3> = {
      P: geo.P, K1: geo.K1, K2: geo.K2, H1: geo.H1, H2: geo.H2, O1: geo.O1, O2: geo.O2, Vp: geo.smallConeVertex, Vg: geo.largeConeVertex,
    }
    const pA = pointMap[measureA] || (measureA.startsWith('free_') ? freeClickPoints[parseInt(measureA.replace('free_', ''))] : null)
    const pB = pointMap[measureB] || (measureB.startsWith('free_') ? freeClickPoints[parseInt(measureB.replace('free_', ''))] : null)
    if (!pA || !pB) return null
    return pA.distanceTo(pB)
  }, [measureA, measureB, geo, freeClickPoints])

  const measureDistance = getMeasureDistance()

  return (
    <div className={`min-h-screen flex flex-col bg-[var(--hypoid-page-bg)] ${textMainClass}`} data-theme={theme}>
      {/* Header */}
      <header className="border-b px-4 py-2.5 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-[var(--hypoid-header-gradient-from)] via-[var(--hypoid-header-gradient-via)] to-[var(--hypoid-header-gradient-to)]" style={{ borderColor: 'var(--hypoid-border-faint)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-emerald-500 flex items-center justify-center text-base font-bold shadow-lg shadow-amber-500/20 relative overflow-hidden">
            <span className="relative z-10">⚙</span>
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
          </div>
          <div>
            <h1 className={`text-base font-bold tracking-tight bg-gradient-to-r ${isPaper ? 'from-gray-900 to-gray-700' : 'from-white to-white/80'} bg-clip-text text-transparent`}>{t('app.title', lang)}</h1>
            <p className="text-[10px]" style={{ color: 'var(--hypoid-text-faint)' }}>{t('app.subtitle', lang)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 hypoid-header-badges">
          <button
            onClick={() => setShowHelp(true)}
            className="px-2 py-1 text-[10px] rounded border transition-all duration-200"
            style={{ borderColor: 'var(--hypoid-border)', color: 'var(--hypoid-text-dim)', background: 'var(--hypoid-bg-subtle)' }}
          >
            {t('btn.help', lang)}
          </button>
          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="px-2 py-1 text-[10px] rounded border transition-all duration-200 flex items-center gap-1"
            style={{ borderColor: 'var(--hypoid-border)', color: 'var(--hypoid-text-dim)', background: 'var(--hypoid-bg-subtle)' }}
          >
            <span className="hypoid-theme-dot" style={{ background: themeColors[theme] }} />
            {t(`theme.${theme}`, lang)}
          </button>
          {/* Language toggle */}
          <button
            onClick={toggleLanguage}
            className="px-2 py-1 text-[10px] rounded border transition-all duration-200"
            style={{ borderColor: 'var(--hypoid-border)', color: 'var(--hypoid-text-dim)', background: 'var(--hypoid-bg-subtle)' }}
          >
            {lang === 'zh' ? 'EN / 中' : '中 / EN'}
          </button>
          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/5 px-1.5 hypoid-badge-pop">
            <span className="hypoid-badge-label">Σ = </span>{sigma}°
          </Badge>
          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-1.5 hypoid-badge-pop">
            <span className="hypoid-badge-label">Eₚ = </span>{ep.toFixed(1)}
          </Badge>
          <Badge variant="outline" className="text-[10px] border-amber-400/30 text-amber-300 bg-amber-400/5 px-1.5 hypoid-badge-pop">
            <span className="hypoid-badge-label">γ = </span>{gammaDeg}°
          </Badge>
          <Badge variant="outline" className="text-[10px] border-emerald-400/30 text-emerald-300 bg-emerald-400/5 px-1.5 hypoid-badge-pop">
            <span className="hypoid-badge-label">Γ = </span>{GammaDeg}°
          </Badge>
        </div>
      </header>

      {/* Main content */}
      <div className={`flex-1 flex flex-col lg:flex-row overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 bg-[var(--hypoid-page-bg)]' : ''}`}>
        {/* 3D Canvas + Timeline */}
        <div className="flex-1 flex flex-col relative min-h-[400px]">
          <div className="flex-1 relative">
            <Canvas
              camera={{ position: [12, 8, 10], fov: 50, near: 0.1, far: 200 }}
              gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
              style={{ background: 'var(--hypoid-page-bg)' }}
              onCreated={({ gl }) => {
                canvasRef.current = gl.domElement
                setSceneLoading(false)
              }}
            >
              <HypoidGearScene geo={geo} steps={steps} cameraView={cameraView} rotateCones={rotateCones} meshingEnabled={meshingEnabled} compGeo={compGeo} showComparison={showComparison} showForceVectors={showForceVectors} showCutaway={showCutaway} showConeGenerators={showConeGenerators} showNormals={showNormals} onHoverPoint={handleHoverPoint} onClickPoint={handleMeasureClick} measureA={measureA} measureB={measureB} freeClickPoints={freeClickPoints} measureMode={measureMode} onFreeClick={handleFreeClick} lang={lang} onCameraUpdate={handleCameraUpdate} onFpsUpdate={handleFpsUpdate} />
            </Canvas>

            {/* Loading Splash Screen */}
            {sceneLoading && (
              <div className="hypoid-splash-screen">
                <div className="hypoid-splash-icon">⚙</div>
                <div className="hypoid-splash-text">{t('loading.text', lang)}</div>
              </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10">
                <div className="hypoid-record-indicator">
                  <span className="hypoid-record-dot" />
                  {t('record.indicator', lang)}
                </div>
              </div>
            )}

            {/* Camera hint & coordinate display */}
            <div className="absolute bottom-3 left-3 text-[10px] pointer-events-none flex flex-col gap-0.5" style={{ color: 'var(--hypoid-text-faint)' }}>
              <span>{t('hint.mouse', lang)}</span>
              <span>{t('hint.keyboard', lang)}</span>
              <div className="hypoid-coord-display mt-0.5">
                <div>{t('cam.position', lang)}: ({cameraPos.x.toFixed(1)}, {cameraPos.y.toFixed(1)}, {cameraPos.z.toFixed(1)})</div>
              </div>
            </div>

            {/* Mini 3D Compass Widget */}
            <div className="absolute bottom-16 left-3 pointer-events-none">
              <CompassWidget cameraPos={cameraPos} />
            </div>

            {/* Measurement panel overlay */}
            {measureMode && (
              <div className="hypoid-measure-panel">
                <div className="flex items-center gap-3">
                  <span className="text-amber-400">📏</span>
                  <span>
                    {!measureA ? t('measure.selectA', lang) : !measureB ? (
                      <>{t('measure.selectB', lang)} <span className="text-white/30 text-[9px]">({t('measure.freeClickHint', lang)})</span></>
                    ) : (
                      <>{t('measure.distance', lang)}: {measureA}→{measureB} = <span className="text-amber-400 font-bold">{measureDistance?.toFixed(3) ?? '—'}</span></>
                    )}
                  </span>
                  <button onClick={clearMeasurement} className="text-white/40 hover:text-white text-sm ml-1">{t('btn.measureClear', lang)}</button>
                </div>
              </div>
            )}

            {/* Hover tooltip */}
            {hoveredPoint && pointInfoMap[hoveredPoint] && (
              <div
                className="hypoid-hover-tooltip"
                style={{ left: mousePos.x + 15, top: mousePos.y - 10, opacity: 1 }}
              >
                <div style={{ color: '#f59e0b', fontWeight: 600, marginBottom: 2 }}>{pointInfoMap[hoveredPoint].name}</div>
                <div>{t('hover.coords', lang)}: ({pointInfoMap[hoveredPoint].pos.x.toFixed(2)}, {pointInfoMap[hoveredPoint].pos.y.toFixed(2)}, {pointInfoMap[hoveredPoint].pos.z.toFixed(2)})</div>
                {pointInfoMap[hoveredPoint].extra && <div style={{ color: '#fbbf24', marginTop: 2 }}>{pointInfoMap[hoveredPoint].extra}</div>}
              </div>
            )}

            {/* Step descriptions overlay */}
            <div className="absolute top-3 left-3 max-w-[280px]">
              <Card className="bg-black/70 border-white/10 backdrop-blur-md shadow-xl">
                <CardContent className="p-2.5">
                  <div className="space-y-0.5">
                    {stepNames.map((name, i) => (
                      <div
                        key={i}
                        className={`text-[10px] transition-all duration-200 ${
                          steps[i]
                            ? 'text-white/70 translate-x-0'
                            : 'text-white/15 -translate-x-1'
                        }`}
                      >
                        <span className="font-medium">{name}</span>
                        {steps[i] && (
                          <span className="ml-1 text-white/30">— {stepDescriptions[i]}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Mobile panel toggle */}
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="lg:hidden absolute top-3 right-3 z-20 px-2.5 py-1.5 rounded-lg bg-black/70 border border-white/20 text-white/70 text-xs hover:bg-black/90 transition-colors backdrop-blur-sm"
            >
              {panelOpen ? t('mobile.closePanel', lang) : t('mobile.openPanel', lang)}
            </button>

            {/* Camera preset buttons */}
            <div className="absolute bottom-3 right-3 flex gap-1 hypoid-camera-presets">
              {[
                { key: 'iso', label: t('cam.iso', lang) },
                { key: 'front', label: t('cam.front', lang) },
                { key: 'side', label: t('cam.side', lang) },
                { key: 'top', label: t('cam.top', lang) },
              ].map(v => (
                <button
                  key={v.key}
                  onClick={() => setCameraView(v.key + Date.now())}
                  className={`px-2 py-1 text-[10px] rounded transition-all duration-200 ${
                    cameraView.startsWith(v.key)
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* Fullscreen toggle button */}
            <button
              onClick={toggleFullscreen}
              className="absolute top-3 right-3 z-10 px-2.5 py-1.5 rounded-lg bg-black/70 border border-white/20 text-white/70 text-xs hover:bg-black/90 transition-colors backdrop-blur-sm"
              title={isFullscreen ? t('btn.exitFullscreen', lang) : t('btn.fullscreen', lang)}
            >
              {isFullscreen ? t('btn.exitFullscreen', lang) : t('btn.fullscreen', lang)}
            </button>

            {/* Screenshot success toast */}
            {screenshotDone && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs backdrop-blur-sm transition-opacity duration-300">
                {t('btn.screenshotSuccess', lang)}
              </div>
            )}

            {/* SVG export success toast */}
            {svgExported && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs backdrop-blur-sm transition-opacity duration-300">
                {t('btn.svgExportSuccess', lang)}
              </div>
            )}

            {/* Report generated toast */}
            {reportGenerated && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs backdrop-blur-sm transition-opacity duration-300">
                {t('btn.reportSuccess', lang)}
              </div>
            )}
          </div>

          {/* Animation Timeline Scrubber */}
          <AnimationTimeline
            steps={steps}
            activeStep={activeStep}
            autoPlaying={autoPlaying}
            onStepClick={handleTimelineStepClick}
          />
        </div>

        {/* Mobile panel backdrop */}
        {!isFullscreen && panelOpen && (
          <div
            className="lg:hidden fixed inset-0 z-20 hypoid-panel-backdrop"
            onClick={() => setPanelOpen(false)}
          />
        )}

        {/* Control Panel (hidden in fullscreen) */}
        {!isFullscreen && (
        <div className={`${
          panelOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        } w-full lg:w-[330px] border-t lg:border-t-0 lg:border-l overflow-y-auto flex-shrink-0 hypoid-glass-panel hypoid-panel-top-gradient transition-transform duration-300 lg:block fixed lg:relative right-0 top-0 bottom-0 z-30 lg:z-auto hypoid-panel-scroll`} style={{ borderColor: 'var(--hypoid-border-faint)' }}
          ref={panelScrollRef}
          onScroll={() => {
            if (panelScrollRef.current) {
              setPanelScrolled(panelScrollRef.current.scrollTop > 200)
            }
          }}
        >
          <div className="p-4 space-y-4">
            {/* Close button for mobile */}
            <button
              onClick={() => setPanelOpen(false)}
              className="lg:hidden absolute top-3 right-3 text-[var(--hypoid-text-dim)] hover:text-[var(--hypoid-text)] text-sm z-40"
            >
              ✕
            </button>

            {/* Parameters */}
            <div className="hypoid-section-hover p-1 -m-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="hypoid-section-header text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--hypoid-text-dim)' }}>{t('section.params', lang)}</h3>
                {/* Undo/Redo buttons */}
                <div className="flex gap-0.5">
                  <button
                    onClick={handleUndo}
                    disabled={!canUndo}
                    className={`px-1.5 py-0.5 text-[9px] rounded transition-all duration-200 ${
                      canUndo ? 'hover:bg-white/10 border' : 'cursor-not-allowed border'
                    }`}
                    style={{ color: canUndo ? 'var(--hypoid-text-dim)' : 'var(--hypoid-text-faint)', borderColor: canUndo ? 'var(--hypoid-border)' : 'var(--hypoid-border-faint)' }}
                    title={t('btn.undo', lang)}
                  >
                    {t('btn.undo', lang)}
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={!canRedo}
                    className={`px-1.5 py-0.5 text-[9px] rounded transition-all duration-200 ${
                      canRedo ? 'hover:bg-white/10 border' : 'cursor-not-allowed border'
                    }`}
                    style={{ color: canRedo ? 'var(--hypoid-text-dim)' : 'var(--hypoid-text-faint)', borderColor: canRedo ? 'var(--hypoid-border)' : 'var(--hypoid-border-faint)' }}
                    title={t('btn.redo', lang)}
                  >
                    {t('btn.redo', lang)}
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <NumericSlider label={t('param.sigma', lang)} value={sigma} onChange={setSigma} min={30} max={150} step={1} color="var(--hypoid-amber)" unit="°" sliderClassName="hypoid-slider-amber" />
                <NumericSlider label={t('param.ep', lang)} value={ep} onChange={setEp} min={0.5} max={8} step={0.1} color="var(--hypoid-emerald)" sliderClassName="hypoid-slider-emerald" />
                <NumericSlider label={t('param.pRatio', lang)} value={pRatio} onChange={setPRatio} min={0.1} max={0.9} step={0.01} color="var(--hypoid-red)" sliderClassName="hypoid-slider-red" />
              </div>

              {/* Presets */}
              <div className="mt-3">
                <div className="text-[10px] mb-1.5" style={{ color: 'var(--hypoid-text-faint)' }}>{t('preset.label', lang)}</div>
                <div className="flex gap-1 flex-wrap">
                  {presets.map((p, i) => (
                    <TooltipProvider key={i}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => applyPreset(p)}
                            className={`px-2 py-0.5 text-[9px] rounded border transition-all duration-200 hypoid-interactive hypoid-preset-btn ${
                              sigma === p.sigma && Math.abs(ep - p.ep) < 0.01 && Math.abs(pRatio - p.pRatio) < 0.01
                                ? 'hypoid-preset-active'
                                : ''
                            }`}
                            style={{
                              borderColor: sigma === p.sigma && Math.abs(ep - p.ep) < 0.01 && Math.abs(pRatio - p.pRatio) < 0.01
                                ? 'var(--hypoid-border)' : 'var(--hypoid-border-faint)',
                              color: sigma === p.sigma && Math.abs(ep - p.ep) < 0.01 && Math.abs(pRatio - p.pRatio) < 0.01
                                ? 'var(--hypoid-text)' : 'var(--hypoid-text-dim)',
                              background: sigma === p.sigma && Math.abs(ep - p.ep) < 0.01 && Math.abs(pRatio - p.pRatio) < 0.01
                                ? 'var(--hypoid-bg-hover)' : 'var(--hypoid-bg-subtle)',
                            }}
                          >
                            {p.name}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                          {p.desc}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-1.5 mt-3">
                <Button variant="outline" size="sm" onClick={resetDefaults} className="flex-1 text-[10px] h-7 transition-all duration-200 hypoid-ripple" style={{ borderColor: 'var(--hypoid-border)', color: 'var(--hypoid-text-dim)' }}>
                  {t('btn.reset', lang)}
                </Button>
                <Button variant="outline" size="sm" onClick={playStepByStep} className="flex-1 text-[10px] h-7 transition-all duration-200 hypoid-ripple" style={{ borderColor: 'var(--hypoid-border)', color: 'var(--hypoid-text-dim)' }}>
                  {t('btn.stepPlay', lang)}
                </Button>
                <Button variant="outline" size="sm" onClick={startAutoPlay} className={`flex-1 text-[10px] h-7 transition-all duration-200 hypoid-ripple ${autoPlaying ? 'hypoid-autoplay-pulse bg-amber-500/20 border-amber-500/40 text-amber-400' : ''}`} style={!autoPlaying ? { borderColor: 'var(--hypoid-border)', color: 'var(--hypoid-text-dim)' } : undefined}>
                  {autoPlaying ? t('btn.stopPlay', lang) : t('btn.autoPlay', lang)}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setMeasureMode(!measureMode); if (!measureMode) { setMeasureA(null); setMeasureB(null); setFreeClickPoints([]) } }} className={`text-[10px] h-7 transition-all duration-200 hypoid-ripple ${measureMode ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : ''}`} style={!measureMode ? { borderColor: 'var(--hypoid-border)', color: 'var(--hypoid-text-dim)' } : undefined}>
                  {t('btn.measure', lang)}
                </Button>
                <Button variant="outline" size="sm" onClick={handleScreenshot} className={`text-[10px] h-7 transition-all duration-200 hypoid-ripple ${screenshotDone ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : ''}`} style={!screenshotDone ? { borderColor: 'var(--hypoid-border)', color: 'var(--hypoid-text-dim)' } : undefined}>
                  {screenshotDone ? t('btn.screenshotSuccess', lang) : t('btn.screenshot', lang)}
                </Button>
                <Button variant="outline" size="sm" onClick={toggleRecording} className={`text-[10px] h-7 transition-all duration-200 hypoid-ripple ${isRecording ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse' : ''}`} style={!isRecording ? { borderColor: 'var(--hypoid-border)', color: 'var(--hypoid-text-dim)' } : undefined}>
                  {isRecording ? t('btn.stopRecord', lang) : t('btn.record', lang)}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSvgExport} className={`text-[10px] h-7 transition-all duration-200 hypoid-ripple ${svgExported ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : ''}`} style={!svgExported ? { borderColor: 'var(--hypoid-border)', color: 'var(--hypoid-text-dim)' } : undefined}>
                  {svgExported ? t('btn.svgExportSuccess', lang) : t('btn.svgExport', lang)}
                </Button>
                <Button variant="outline" size="sm" onClick={handleReport} className={`text-[10px] h-7 transition-all duration-200 hypoid-ripple ${reportGenerated ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : ''}`} style={!reportGenerated ? { borderColor: 'var(--hypoid-border)', color: 'var(--hypoid-text-dim)' } : undefined}>
                  {reportGenerated ? t('btn.reportSuccess', lang) : t('btn.report', lang)}
                </Button>
              </div>

              {/* Rotate cones toggle */}
              <div className="flex items-center justify-between mt-2 p-1.5 rounded hypoid-toggle-row" style={{ background: 'var(--hypoid-bg-subtle)' }}>
                <span className="text-[10px]" style={{ color: 'var(--hypoid-text-dim)' }}>{t('toggle.rotateCones', lang)}</span>
                <Switch checked={rotateCones} onCheckedChange={setRotateCones} className="scale-[0.6]" />
              </div>

              {/* Meshing simulation toggle */}
              <div className="flex items-center justify-between mt-1.5 p-1.5 rounded hypoid-toggle-row" style={{ background: 'var(--hypoid-bg-subtle)' }}>
                <span className="text-[10px]" style={{ color: 'var(--hypoid-text-dim)' }}>{t('toggle.meshing', lang)}</span>
                <Switch checked={meshingEnabled} onCheckedChange={setMeshingEnabled} className="scale-[0.6]" />
              </div>

              {/* Force vectors toggle */}
              <div className="flex items-center justify-between mt-1.5 p-1.5 rounded hypoid-toggle-row" style={{ background: 'var(--hypoid-bg-subtle)' }}>
                <span className="text-[10px]" style={{ color: 'var(--hypoid-text-dim)' }}>{t('toggle.forceVectors', lang)}</span>
                <Switch checked={showForceVectors} onCheckedChange={setShowForceVectors} className="scale-[0.6]" />
              </div>

              {/* Cutaway toggle */}
              <div className="flex items-center justify-between mt-1.5 p-1.5 rounded hypoid-toggle-row" style={{ background: 'var(--hypoid-bg-subtle)' }}>
                <span className="text-[10px]" style={{ color: 'var(--hypoid-text-dim)' }}>{t('toggle.cutaway', lang)}</span>
                <Switch checked={showCutaway} onCheckedChange={setShowCutaway} className="scale-[0.6]" />
              </div>

              {/* Cone Generator Lines toggle (Feature 1) */}
              <div className="flex items-center justify-between mt-1.5 p-1.5 rounded hypoid-toggle-row" style={{ background: 'var(--hypoid-bg-subtle)' }}>
                <span className="text-[10px]" style={{ color: 'var(--hypoid-text-dim)' }}>{t('toggle.showConeGenerators', lang)}</span>
                <Switch checked={showConeGenerators} onCheckedChange={setShowConeGenerators} className="scale-[0.6]" />
              </div>

              {/* Cone Surface Normals toggle (Feature 4) */}
              <div className="flex items-center justify-between mt-1.5 p-1.5 rounded hypoid-toggle-row" style={{ background: 'var(--hypoid-bg-subtle)' }}>
                <span className="text-[10px]" style={{ color: 'var(--hypoid-text-dim)' }}>{t('toggle.showNormals', lang)}</span>
                <Switch checked={showNormals} onCheckedChange={setShowNormals} className="scale-[0.6]" />
              </div>

              {/* Comparison overlay toggle */}
              <div className="flex items-center justify-between mt-1.5 p-1.5 rounded hypoid-toggle-row" style={{ background: 'var(--hypoid-bg-subtle)' }}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-[10px] cursor-help" style={{ color: 'var(--hypoid-text-dim)' }}>{t('toggle.comparison', lang)}</span>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs max-w-[200px]">
                      {t('toggle.comparison.tip', lang)}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Switch checked={showComparison} onCheckedChange={setShowComparison} className="scale-[0.6]" />
              </div>

              {/* Parameter sweep animation */}
              <div className="flex items-center justify-between mt-1.5 p-1.5 rounded hypoid-toggle-row" style={{ background: 'var(--hypoid-bg-subtle)' }}>
                <div className="flex items-center gap-1">
                  <span className="text-[10px]" style={{ color: 'var(--hypoid-text-dim)' }}>{t('toggle.sweep', lang)}</span>
                  <select
                    value={sweepParam}
                    onChange={(e) => setSweepParam(e.target.value as 'sigma' | 'ep')}
                    className="text-[9px] border rounded px-1 py-0.5"
                    style={{ background: 'var(--hypoid-bg-subtle)', borderColor: 'var(--hypoid-border-faint)', color: 'var(--hypoid-text-dim)' }}
                    disabled={sweepPlaying}
                  >
                    <option value="ep">Eₚ</option>
                    <option value="sigma">Σ</option>
                  </select>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSweep}
                  className={`text-[9px] h-5 px-2 transition-all duration-200 ${
                    sweepPlaying ? 'text-amber-400 bg-amber-500/10' : ''
                  }`}
                  style={!sweepPlaying ? { color: 'var(--hypoid-text-dim)' } : undefined}
                >
                  {sweepPlaying ? t('toggle.sweepStop', lang) : t('toggle.sweepBtn', lang)}
                </Button>
              </div>

              {/* Share URL button */}
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={shareUrl} className="w-full text-[10px] h-6 transition-all duration-200" style={{ borderColor: 'var(--hypoid-border)', color: 'var(--hypoid-text-dim)' }}>
                  {copiedUrl ? t('btn.shared', lang) : t('btn.share', lang)}
                </Button>
              </div>

              {/* Save/Load Parameters */}
              <SaveLoadParams sigma={sigma} ep={ep} pRatio={pRatio} onLoad={handleLoadSaved} />
            </div>

            <div className="hypoid-separator-gradient" />

            {/* Step toggles */}
            <div className="hypoid-section-hover p-1 -m-1">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="hypoid-section-header text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--hypoid-text-dim)' }}>{t('section.steps', lang)}</h3>
                <Button variant="ghost" size="sm" onClick={toggleAll} className="text-[10px] h-5 px-2 transition-colors" style={{ color: 'var(--hypoid-text-faint)' }}>
                  {showAll ? t('steps.hideAll', lang) : t('steps.showAll', lang)}
                </Button>
              </div>
              <div className="space-y-1 md:space-y-1 hypoid-steps-mobile-scroll">
                {stepNames.map((name, i) => (
                  <div key={i}>
                    <div
                      className="flex items-center justify-between p-1.5 rounded-lg transition-all duration-200 cursor-pointer"
                      style={{ background: steps[i] ? 'var(--hypoid-bg-subtle)' : 'transparent' }}
                      onClick={() => toggleStep(i)}
                    >
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <span className="text-[11px] transition-colors duration-200" style={{ color: steps[i] ? 'var(--hypoid-text)' : 'var(--hypoid-text-faint)' }}>
                          {name}
                        </span>
                        {steps[i] && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedStep(expandedStep === i ? null : i) }}
                            className="text-[9px] ml-auto mr-1 flex-shrink-0"
                            style={{ color: 'var(--hypoid-text-faint)' }}
                          >
                            <span className="hypoid-toggle-arrow" data-open={expandedStep === i}>▸</span>
                          </button>
                        )}
                      </div>
                      <Switch checked={steps[i]} onCheckedChange={() => toggleStep(i)} className="scale-[0.65] flex-shrink-0" />
                    </div>
                    <div
                      className="hypoid-section-content"
                      data-state={expandedStep === i && steps[i] ? 'expanded' : 'collapsed'}
                    >
                      {expandedStep === i && steps[i] && (
                        <div className="hypoid-section-slide-in px-1.5 pb-1.5 pt-0.5">
                          <p className="text-[9px] leading-relaxed p-2 rounded-md border" style={{ color: 'var(--hypoid-text-dim)', background: 'var(--hypoid-bg-subtle)', borderColor: 'var(--hypoid-border-faint)' }}>
                            {stepDetailedDescriptions[i]}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hypoid-separator-gradient" />

            {/* Computed values */}
            <div className="hypoid-section-hover p-1 -m-1">
              <h3 className="hypoid-section-header text-[10px] font-semibold mb-2.5 uppercase tracking-[0.2em]" style={{ color: 'var(--hypoid-text-dim)' }}>{t('section.results', lang)}</h3>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <ValueCard tooltip={t('tip.gamma', lang)} copyValue={gammaDeg} copyLabel="γ" onCopy={handleCopyValue}>
                  <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/15 hypoid-value-depth">
                    <div className="flex items-center justify-between">
                      <div className="text-amber-400/40 text-[9px]">{t('val.gamma', lang)}</div>
                      <SparklineMini values={gammaHistory} color="#f59e0b" />
                    </div>
                    <div className="text-amber-400 font-mono text-base font-bold hypoid-value-animate">{gammaDeg}°</div>
                  </div>
                </ValueCard>
                <ValueCard tooltip={t('tip.Gamma', lang)} copyValue={GammaDeg} copyLabel="Γ" onCopy={handleCopyValue}>
                  <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/15 hypoid-value-depth">
                    <div className="flex items-center justify-between">
                      <div className="text-emerald-400/40 text-[9px]">{t('val.Gamma', lang)}</div>
                      <SparklineMini values={gamma2History} color="#10b981" />
                    </div>
                    <div className="text-emerald-400 font-mono text-base font-bold hypoid-value-animate">{GammaDeg}°</div>
                  </div>
                </ValueCard>
                <ValueCard tooltip={t('tip.ratio', lang)} copyValue={(geo.R / Math.max(geo.Rp, 0.01)).toFixed(2)} copyLabel="R/Rₚ" onCopy={handleCopyValue}>
                  <div className="col-span-2 p-2 rounded-lg bg-gradient-to-r from-amber-500/5 via-white/[0.02] to-emerald-500/5 border" style={{ borderColor: 'var(--hypoid-border-faint)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400/60 font-mono text-xs">{gammaDeg}°</span>
                        <span style={{ color: 'var(--hypoid-text-faint)' }}>→</span>
                        <span className="text-emerald-400/60 font-mono text-xs">{GammaDeg}°</span>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px]" style={{ color: 'var(--hypoid-text-faint)' }}>R / Rₚ</div>
                        <div className="font-mono text-sm font-bold" style={{ color: 'var(--hypoid-text)' }}>
                          {(geo.R / Math.max(geo.Rp, 0.01)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </ValueCard>
                <ValueCard tooltip={t('tip.H1P', lang)} copyValue={geo.H1.distanceTo(geo.P).toFixed(2)} copyLabel="|H₁P|" onCopy={handleCopyValue}>
                  <div className="p-1.5 rounded-md border" style={{ background: 'var(--hypoid-bg-subtle)', borderColor: 'var(--hypoid-border-faint)' }}>
                    <div className="text-[9px]" style={{ color: 'var(--hypoid-text-faint)' }}>{t('val.H1P', lang)}</div>
                    <div className="font-mono" style={{ color: 'var(--hypoid-text)' }}>{geo.H1.distanceTo(geo.P).toFixed(2)}</div>
                  </div>
                </ValueCard>
                <ValueCard tooltip={t('tip.H2P', lang)} copyValue={geo.H2.distanceTo(geo.P).toFixed(2)} copyLabel="|H₂P|" onCopy={handleCopyValue}>
                  <div className="p-1.5 rounded-md border" style={{ background: 'var(--hypoid-bg-subtle)', borderColor: 'var(--hypoid-border-faint)' }}>
                    <div className="text-[9px]" style={{ color: 'var(--hypoid-text-faint)' }}>{t('val.H2P', lang)}</div>
                    <div className="font-mono" style={{ color: 'var(--hypoid-text)' }}>{geo.H2.distanceTo(geo.P).toFixed(2)}</div>
                  </div>
                </ValueCard>
                <ValueCard tooltip={t('tip.Ap', lang)} copyValue={geo.Ap.toFixed(2)} copyLabel="Aₚ" onCopy={handleCopyValue}>
                  <div className="p-1.5 rounded-md border" style={{ background: 'var(--hypoid-bg-subtle)', borderColor: 'var(--hypoid-border-faint)' }}>
                    <div className="text-[9px]" style={{ color: 'var(--hypoid-text-faint)' }}>{t('val.Ap', lang)}</div>
                    <div className="font-mono" style={{ color: 'var(--hypoid-text)' }}>{geo.Ap.toFixed(2)}</div>
                  </div>
                </ValueCard>
                <ValueCard tooltip={t('tip.A', lang)} copyValue={geo.A.toFixed(2)} copyLabel="A" onCopy={handleCopyValue}>
                  <div className="p-1.5 rounded-md border" style={{ background: 'var(--hypoid-bg-subtle)', borderColor: 'var(--hypoid-border-faint)' }}>
                    <div className="text-[9px]" style={{ color: 'var(--hypoid-text-faint)' }}>{t('val.A', lang)}</div>
                    <div className="font-mono" style={{ color: 'var(--hypoid-text)' }}>{geo.A.toFixed(2)}</div>
                  </div>
                </ValueCard>
                <ValueCard tooltip="小轮节圆半径 Rₚ" copyValue={geo.Rp.toFixed(2)} copyLabel="Rₚ" onCopy={handleCopyValue}>
                  <div className="p-1.5 rounded-md bg-amber-500/5 border border-amber-500/10">
                    <div className="text-amber-400/30 text-[9px]">{t('val.Rp', lang)}</div>
                    <div className="text-amber-400/70 font-mono">{geo.Rp.toFixed(2)}</div>
                  </div>
                </ValueCard>
                <ValueCard tooltip="大轮节圆半径 R" copyValue={geo.R.toFixed(2)} copyLabel="R" onCopy={handleCopyValue}>
                  <div className="p-1.5 rounded-md bg-emerald-500/5 border border-emerald-500/10">
                    <div className="text-emerald-400/30 text-[9px]">{t('val.R', lang)}</div>
                    <div className="text-emerald-400/70 font-mono">{geo.R.toFixed(2)}</div>
                  </div>
                </ValueCard>
              </div>

              {/* Expandable sections using ExpandableSection component */}
              <ExpandableSection label={t('section.gearRatio', lang)} open={showGearRatioCalc} onToggle={() => setShowGearRatioCalc(!showGearRatioCalc)}>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[10px]">
                  {(() => {
                    const gearRatio = geo.R / Math.max(geo.Rp * Math.cos(geo.epsilonPrime), 0.01)
                    const betaP = geo.epsilonPrime * 180 / Math.PI
                    const betaG = (geo.epsilon - geo.epsilonPrime) * 180 / Math.PI
                    const sumDist = geo.Ap + geo.A
                    const offsetRatio = geo.Ep / Math.max(geo.A, 0.01)
                    return (
                      <>
                        <div className="p-1.5 rounded bg-rose-500/8 border border-rose-500/12"><div className="text-rose-400/40">{t('gearRatio.ratio', lang)}</div><div className="text-rose-400 font-mono">{gearRatio.toFixed(2)}</div></div>
                        <div className="p-1.5 rounded bg-sky-500/8 border border-sky-500/12"><div className="text-sky-400/40">{t('gearRatio.betaP', lang)}</div><div className="text-sky-400 font-mono">{betaP.toFixed(1)}°</div></div>
                        <div className="p-1.5 rounded bg-teal-500/8 border border-teal-500/12"><div className="text-teal-400/40">{t('gearRatio.betaG', lang)}</div><div className="text-teal-400 font-mono">{betaG.toFixed(1)}°</div></div>
                        <div className="p-1.5 rounded bg-orange-500/8 border border-orange-500/12"><div className="text-orange-400/40">{t('gearRatio.sumDist', lang)}</div><div className="text-orange-400 font-mono">{sumDist.toFixed(2)}</div></div>
                        <div className="col-span-2 p-1.5 rounded bg-violet-500/8 border border-violet-500/12"><div className="text-violet-400/40">{t('gearRatio.offsetRatio', lang)}</div><div className="text-violet-400 font-mono">{offsetRatio.toFixed(3)}</div></div>
                      </>
                    )
                  })()}
                </div>
              </ExpandableSection>

              <ExpandableSection label={lang === 'zh' ? '节平面截面图' : 'Cross Section Diagram'} open={showCrossSection} onToggle={() => setShowCrossSection(!showCrossSection)}>
                <div className="mt-1.5 p-2 rounded-lg border" style={{ background: 'var(--hypoid-bg-subtle)', borderColor: 'var(--hypoid-border-faint)' }}>
                  <svg viewBox="0 0 200 120" className="w-full" style={{ maxHeight: '120px' }}>
                    <rect x="0" y="0" width="200" height="120" fill="rgba(0,0,0,0.3)" rx="4" />
                    <line x1="100" y1="5" x2="100" y2="115" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                    <line x1="5" y1="60" x2="195" y2="60" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                    <circle cx={100 - (geo.smallConeBaseCenter.x - geo.largeConeBaseCenter.x) * 8} cy={60 - (geo.smallConeBaseCenter.z - geo.largeConeBaseCenter.z) * 8} r={Math.min(geo.Rp * 8, 50)} fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7" />
                    <circle cx={100} cy={60} r={Math.min(geo.R * 8, 55)} fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7" />
                    <circle cx={100 - (geo.H2.x - geo.P.x) * 8} cy={60 - (geo.H2.z - geo.P.z) * 8} r="3" fill="#ef4444" opacity="0.8" />
                    <circle cx={100 - (geo.H1.x - geo.H2.x) * 8} cy={60 - (geo.H1.z - geo.H2.z) * 8} r="1.5" fill="#f59e0b" opacity="0.6" />
                    <circle cx="100" cy="60" r="1.5" fill="#10b981" opacity="0.6" />
                    <text x="4" y="14" fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="monospace">T</text>
                    <text x="4" y="112" fill="#fbbf24" fontSize="6" fontFamily="monospace" opacity="0.6">Rₚ={geo.Rp.toFixed(1)}</text>
                    <text x="140" y="112" fill="#34d399" fontSize="6" fontFamily="monospace" opacity="0.6">R={geo.R.toFixed(1)}</text>
                    <text x={100 - (geo.H2.x - geo.P.x) * 8 + 5} y={60 - (geo.H2.z - geo.P.z) * 8 + 3} fill="#ef4444" fontSize="6" fontFamily="serif" opacity="0.7">P</text>
                  </svg>
                </div>
              </ExpandableSection>

              <ExpandableSection label={lang === 'zh' ? '参数影响曲线' : 'Parameter Effect Graph'} open={showEffectGraph} onToggle={() => setShowEffectGraph(!showEffectGraph)}>
                <ParameterEffectGraph sigma={sigma} ep={ep} pRatio={pRatio} mode={effectGraphMode} onModeChange={setEffectGraphMode} />
              </ExpandableSection>

              <ExpandableSection label={t('expand.sensitivityHeatmap', lang)} open={showHeatmap} onToggle={() => setShowHeatmap(!showHeatmap)} scrollContainerRef={panelScrollRef}>
                <SensitivityHeatmap sigma={sigma} ep={ep} pRatio={pRatio} viewMode={heatmapMode} onViewModeChange={setHeatmapMode} onSetParams={handleHeatmapSetParams} lang={lang} />
              </ExpandableSection>

              <ExpandableSection label={lang === 'zh' ? '偏置角及位置参数' : 'Derived Parameters'} open={showDerivedParams} onToggle={() => setShowDerivedParams(!showDerivedParams)}>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="p-1.5 rounded bg-purple-500/8 border border-purple-500/12"><div className="text-purple-400/40">{t('val.eta', lang)}</div><div className="text-purple-400 font-mono">{etaDeg}°</div></div>
                  <div className="p-1.5 rounded bg-cyan-500/8 border border-cyan-500/12"><div className="text-cyan-400/40">{t('val.epsilon', lang)}</div><div className="text-cyan-400 font-mono">{epsilonDeg}°</div></div>
                  <div className="p-1.5 rounded bg-pink-500/8 border border-pink-500/12"><div className="text-pink-400/40">{t('val.epsilonPrime', lang)}</div><div className="text-pink-400 font-mono">{epsilonPrimeDeg}°</div></div>
                  <div className="p-1.5 rounded border" style={{ background: 'var(--hypoid-bg-subtle)', borderColor: 'var(--hypoid-border-faint)' }}><div style={{ color: 'var(--hypoid-text-faint)' }}>Zₚ</div><div className="font-mono" style={{ color: 'var(--hypoid-text)' }}>{geo.Zp.toFixed(2)}</div></div>
                  <div className="p-1.5 rounded border" style={{ background: 'var(--hypoid-bg-subtle)', borderColor: 'var(--hypoid-border-faint)' }}><div style={{ color: 'var(--hypoid-text-faint)' }}>Z</div><div className="font-mono" style={{ color: 'var(--hypoid-text)' }}>{geo.Z.toFixed(2)}</div></div>
                  <div className="p-1.5 rounded border" style={{ background: 'var(--hypoid-bg-subtle)', borderColor: 'var(--hypoid-border-faint)' }}><div style={{ color: 'var(--hypoid-text-faint)' }}>Zg</div><div className="font-mono" style={{ color: 'var(--hypoid-text)' }}>{geo.Zg.toFixed(2)}</div></div>
                  <div className="p-1.5 rounded border" style={{ background: 'var(--hypoid-bg-subtle)', borderColor: 'var(--hypoid-border-faint)' }}><div style={{ color: 'var(--hypoid-text-faint)' }}>G</div><div className="font-mono" style={{ color: 'var(--hypoid-text)' }}>{geo.G.toFixed(2)}</div></div>
                </div>
              </ExpandableSection>

              <ExpandableSection label={lang === 'zh' ? '公式推导过程' : 'Formula Derivation'} open={showFormulaDerivation} onToggle={() => setShowFormulaDerivation(!showFormulaDerivation)}>
                <FormulaDerivationPanel geo={geo} />
              </ExpandableSection>

              <ExpandableSection label={lang === 'zh' ? '节锥面展开图' : 'Cone Unrolling'} open={showConeUnroll} onToggle={() => setShowConeUnroll(!showConeUnroll)}>
                <ConeUnrolling gamma={geo.gamma} Gamma={geo.Gamma} Rp={geo.Rp} R={geo.R} Ap={geo.Ap} A={geo.A} />
              </ExpandableSection>

              <ExpandableSection label={t('expand.presetComparison', lang)} open={showPresetComparison} onToggle={() => setShowPresetComparison(!showPresetComparison)}>
                <PresetComparison presets={presets} currentSigma={sigma} currentEp={ep} currentPRatio={pRatio} lang={lang} />
              </ExpandableSection>

              <ExpandableSection label={t('expand.involuteProfile', lang)} open={showInvoluteProfile} onToggle={() => setShowInvoluteProfile(!showInvoluteProfile)} scrollContainerRef={panelScrollRef}>
                <InvoluteProfile geo={geo} lang={lang} />
              </ExpandableSection>

              {/* Assembly Diagram */}
              <ExpandableSection label={t('expand.assembly', lang)} open={showAssembly} onToggle={() => setShowAssembly(!showAssembly)} scrollContainerRef={panelScrollRef}>
                <div className="mt-1.5">
                  <svg viewBox="0 0 300 220" className="hypoid-assembly-svg" style={{ maxHeight: '220px' }}>
                    {(() => {
                      const svgW = 300
                      const svgH = 220
                      const cx = svgW / 2
                      const cy = svgH / 2
                      // Scale radii to fit SVG
                      const maxR = Math.max(geo.Rp, geo.R, 1)
                      const scale = 70 / maxR
                      const smallR = geo.Rp * scale
                      const largeR = geo.R * scale
                      // Offset: pinion is offset in y by Eₚ (scaled)
                      const epScale = Math.min(geo.Ep * scale * 0.5, 30)
                      const smallCx = cx
                      const smallCy = cy - epScale
                      const largeCx = cx
                      const largeCy = cy + epScale
                      // Shaft angle arc
                      const arcR = 35
                      // Rotation direction arrows
                      const smallArrowAngle = Math.PI * 0.3
                      const largeArrowAngle = -Math.PI * 0.7
                      return (
                        <>
                          <rect x="0" y="0" width={svgW} height={svgH} fill="rgba(0,0,0,0.3)" rx="4" />
                          {/* Grid lines */}
                          <line x1={cx} y1="5" x2={cx} y2={svgH - 5} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                          <line x1="5" y1={cy} x2={svgW - 5} y2={cy} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                          {/* Large gear circle */}
                          <circle cx={largeCx} cy={largeCy} r={largeR} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.7" />
                          {/* Small pinion circle */}
                          <circle cx={smallCx} cy={smallCy} r={smallR} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.7" />
                          {/* Centers */}
                          <circle cx={smallCx} cy={smallCy} r="2.5" fill="#f59e0b" opacity="0.8" />
                          <circle cx={largeCx} cy={largeCy} r="2.5" fill="#10b981" opacity="0.8" />
                          {/* Offset distance line */}
                          <line x1={smallCx} y1={smallCy} x2={largeCx} y2={largeCy} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
                          <text x={smallCx + 8} y={(smallCy + largeCy) / 2 + 3} fill="#94a3b8" fontSize="8" fontFamily="monospace">Eₚ={geo.Ep.toFixed(1)}</text>
                          {/* Point P (mesh point) */}
                          <circle cx={smallCx} cy={smallCy + smallR} r="3" fill="#ef4444" opacity="0.9" />
                          <text x={smallCx + 6} y={smallCy + smallR + 3} fill="#ef4444" fontSize="8" fontFamily="serif">P</text>
                          {/* Common tangent at P */}
                          <line x1={smallCx - 25} y1={smallCy + smallR} x2={smallCx + 25} y2={smallCy + smallR} stroke="#22d3ee" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                          <text x={smallCx + 27} y={smallCy + smallR + 3} fill="#22d3ee" fontSize="7" fontFamily="serif" opacity="0.7">{t('assembly.tangent', lang)}</text>
                          {/* Shaft angle arc */}
                          {(() => {
                            const aR = arcR
                            const points: string[] = []
                            const sigmaRad = geo.Sigma
                            for (let i = 0; i <= 20; i++) {
                              const angle = -Math.PI / 2 + (sigmaRad * i / 20)
                              const x = largeCx + aR * Math.cos(angle)
                              const y = largeCy + aR * Math.sin(angle)
                              points.push(`${x},${y}`)
                            }
                            return (
                              <polyline points={points.join(' ')} fill="none" stroke="#e879f9" strokeWidth="1" opacity="0.6" />
                            )
                          })()}
                          <text x={largeCx + arcR + 3} y={largeCy - 5} fill="#e879f9" fontSize="7" fontFamily="monospace" opacity="0.7">Σ={sigma}°</text>
                          {/* Labels */}
                          <text x={smallCx - smallR - 5} y={smallCy - 3} fill="#f59e0b" fontSize="8" fontFamily="serif" textAnchor="end" opacity="0.8">{t('assembly.pinion', lang)} Rₚ={geo.Rp.toFixed(1)}</text>
                          <text x={largeCx + largeR + 5} y={largeCy + 3} fill="#10b981" fontSize="8" fontFamily="serif" opacity="0.8">{t('assembly.gear', lang)} R={geo.R.toFixed(1)}</text>
                          {/* Rotation arrows */}
                          <g transform={`translate(${smallCx}, ${smallCy})`}>
                            <path d={`M ${smallR * 0.7 * Math.cos(smallArrowAngle)} ${-smallR * 0.7 * Math.sin(smallArrowAngle)} A ${smallR * 0.7} ${smallR * 0.7} 0 0 1 ${smallR * 0.7 * Math.cos(smallArrowAngle - 0.5)} ${-smallR * 0.7 * Math.sin(smallArrowAngle - 0.5)}`} fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.6" />
                            <polygon points="0,-3 5,0 0,3" fill="#f59e0b" opacity="0.6" transform={`translate(${smallR * 0.7 * Math.cos(smallArrowAngle - 0.5)}, ${-smallR * 0.7 * Math.sin(smallArrowAngle - 0.5)}) rotate(${(smallArrowAngle - 0.5) * 180 / Math.PI + 90})`} />
                          </g>
                          <g transform={`translate(${largeCx}, ${largeCy})`}>
                            <path d={`M ${largeR * 0.7 * Math.cos(largeArrowAngle)} ${-largeR * 0.7 * Math.sin(largeArrowAngle)} A ${largeR * 0.7} ${largeR * 0.7} 0 0 0 ${largeR * 0.7 * Math.cos(largeArrowAngle + 0.5)} ${-largeR * 0.7 * Math.sin(largeArrowAngle + 0.5)}`} fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.6" />
                            <polygon points="0,-3 5,0 0,3" fill="#10b981" opacity="0.6" transform={`translate(${largeR * 0.7 * Math.cos(largeArrowAngle + 0.5)}, ${-largeR * 0.7 * Math.sin(largeArrowAngle + 0.5)}) rotate(${(largeArrowAngle + 0.5) * 180 / Math.PI + 90})`} />
                          </g>
                          {/* Title */}
                          <text x={svgW / 2} y="14" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="serif" textAnchor="middle">{t('assembly.title', lang)}</text>
                        </>
                      )
                    })()}
                  </svg>
                </div>
              </ExpandableSection>

              {/* Tolerance Analysis */}
              <ExpandableSection label={t('expand.tolerance', lang)} open={showTolerance} onToggle={() => setShowTolerance(!showTolerance)} scrollContainerRef={panelScrollRef}>
                <div className="mt-1.5 space-y-2">
                  {(() => {
                    const deltaEp = 0.1
                    const deltaSigma = 2
                    const gammaBase = geo.gamma * 180 / Math.PI
                    const GammaBase = geo.Gamma * 180 / Math.PI

                    // Compute with +ΔEp
                    const geoPlusEp = computeHypoidGeometry(sigma, ep + deltaEp, pRatio)
                    const gammaPlusEp = geoPlusEp.gamma * 180 / Math.PI
                    const GammaPlusEp = geoPlusEp.Gamma * 180 / Math.PI

                    // Compute with -ΔEp
                    const geoMinusEp = computeHypoidGeometry(sigma, Math.max(0.5, ep - deltaEp), pRatio)
                    const gammaMinusEp = geoMinusEp.gamma * 180 / Math.PI
                    const GammaMinusEp = geoMinusEp.Gamma * 180 / Math.PI

                    // Compute with +ΔΣ
                    const geoPlusSigma = computeHypoidGeometry(sigma + deltaSigma, ep, pRatio)
                    const gammaPlusSigma = geoPlusSigma.gamma * 180 / Math.PI
                    const GammaPlusSigma = geoPlusSigma.Gamma * 180 / Math.PI

                    // Compute with -ΔΣ
                    const geoMinusSigma = computeHypoidGeometry(Math.max(30, sigma - deltaSigma), ep, pRatio)
                    const gammaMinusSigma = geoMinusSigma.gamma * 180 / Math.PI
                    const GammaMinusSigma = geoMinusSigma.Gamma * 180 / Math.PI

                    // Sensitivity (% change per unit tolerance)
                    const gammaSensEp = Math.abs(gammaPlusEp - gammaMinusEp) / (2 * deltaEp) / gammaBase * 100
                    const GammaSensEp = Math.abs(GammaPlusEp - GammaMinusEp) / (2 * deltaEp) / GammaBase * 100
                    const gammaSensSigma = Math.abs(gammaPlusSigma - gammaMinusSigma) / (2 * deltaSigma) / gammaBase * 100
                    const GammaSensSigma = Math.abs(GammaPlusSigma - GammaMinusSigma) / (2 * deltaSigma) / GammaBase * 100

                    const changePct = (val: number, base: number) => {
                      if (base === 0) return 0
                      return ((val - base) / base) * 100
                    }

                    return (
                      <>
                        <div className="text-[8px] px-1" style={{ color: 'var(--hypoid-text-faint)' }}>
                          {t('tolerance.deltaEp', lang)} · {t('tolerance.deltaSigma', lang)}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="hypoid-tolerance-table">
                            <thead>
                              <tr>
                                <th></th>
                                <th>{t('tolerance.base', lang)}</th>
                                <th>{t('tolerance.plusDEp', lang)}</th>
                                <th>{t('tolerance.minusDEp', lang)}</th>
                                <th>{t('tolerance.plusDSigma', lang)}</th>
                                <th>{t('tolerance.minusDSigma', lang)}</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td style={{ color: '#f59e0b' }}>{t('tolerance.gammaCol', lang)}</td>
                                <td>{gammaBase.toFixed(2)}</td>
                                <td className={gammaPlusEp > gammaBase ? 'hypoid-tolerance-up' : 'hypoid-tolerance-down'}>
                                  {gammaPlusEp.toFixed(2)} {gammaPlusEp > gammaBase ? '↑' : '↓'}
                                </td>
                                <td className={gammaMinusEp > gammaBase ? 'hypoid-tolerance-up' : 'hypoid-tolerance-down'}>
                                  {gammaMinusEp.toFixed(2)} {gammaMinusEp > gammaBase ? '↑' : '↓'}
                                </td>
                                <td className={gammaPlusSigma > gammaBase ? 'hypoid-tolerance-up' : 'hypoid-tolerance-down'}>
                                  {gammaPlusSigma.toFixed(2)} {gammaPlusSigma > gammaBase ? '↑' : '↓'}
                                </td>
                                <td className={gammaMinusSigma > gammaBase ? 'hypoid-tolerance-up' : 'hypoid-tolerance-down'}>
                                  {gammaMinusSigma.toFixed(2)} {gammaMinusSigma > gammaBase ? '↑' : '↓'}
                                </td>
                              </tr>
                              <tr>
                                <td style={{ color: '#10b981' }}>{t('tolerance.GammaCol', lang)}</td>
                                <td>{GammaBase.toFixed(2)}</td>
                                <td className={GammaPlusEp > GammaBase ? 'hypoid-tolerance-up' : 'hypoid-tolerance-down'}>
                                  {GammaPlusEp.toFixed(2)} {GammaPlusEp > GammaBase ? '↑' : '↓'}
                                </td>
                                <td className={GammaMinusEp > GammaBase ? 'hypoid-tolerance-up' : 'hypoid-tolerance-down'}>
                                  {GammaMinusEp.toFixed(2)} {GammaMinusEp > GammaBase ? '↑' : '↓'}
                                </td>
                                <td className={GammaPlusSigma > GammaBase ? 'hypoid-tolerance-up' : 'hypoid-tolerance-down'}>
                                  {GammaPlusSigma.toFixed(2)} {GammaPlusSigma > GammaBase ? '↑' : '↓'}
                                </td>
                                <td className={GammaMinusSigma > GammaBase ? 'hypoid-tolerance-up' : 'hypoid-tolerance-down'}>
                                  {GammaMinusSigma.toFixed(2)} {GammaMinusSigma > GammaBase ? '↑' : '↓'}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        {/* Bar chart showing sensitivity */}
                        <div className="mt-2 p-2 rounded-lg border" style={{ background: 'var(--hypoid-bg-subtle)', borderColor: 'var(--hypoid-border-faint)' }}>
                          <div className="text-[8px] mb-1" style={{ color: 'var(--hypoid-text-faint)' }}>{t('tolerance.sensitivity')} — {t('tolerance.change')}</div>
                          <div className="space-y-1.5">
                            {[
                              { label: 'γ / ΔEₚ', pct: changePct(gammaPlusEp, gammaBase), color: '#f59e0b' },
                              { label: 'Γ / ΔEₚ', pct: changePct(GammaPlusEp, GammaBase), color: '#10b981' },
                              { label: 'γ / ΔΣ', pct: changePct(gammaPlusSigma, gammaBase), color: '#f59e0b' },
                              { label: 'Γ / ΔΣ', pct: changePct(GammaPlusSigma, GammaBase), color: '#10b981' },
                            ].map((item, i) => (
                              <div key={i} className="flex items-center gap-2 text-[8px]">
                                <span className="w-12 text-right flex-shrink-0" style={{ color: 'var(--hypoid-text-dim)' }}>{item.label}</span>
                                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--hypoid-border-faint)' }}>
                                  <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                      width: `${Math.min(Math.abs(item.pct) * 10, 100)}%`,
                                      background: item.color,
                                      opacity: 0.7,
                                    }}
                                  />
                                </div>
                                <span className="w-10 text-right flex-shrink-0" style={{ color: item.color }}>{item.pct >= 0 ? '+' : ''}{item.pct.toFixed(2)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </ExpandableSection>

              {/* Parameter History Graph */}
              <ExpandableSection label={t('expand.paramHistory', lang)} open={showParamHistory} onToggle={() => setShowParamHistory(!showParamHistory)} scrollContainerRef={panelScrollRef}>
                <div className="mt-1.5 relative">
                  {(() => {
                    const data = paramHistoryFull
                    if (data.length < 2) {
                      return <div className="text-[9px] p-2" style={{ color: 'var(--hypoid-text-faint)' }}>{lang === 'zh' ? '调整参数后此处将显示历史曲线' : 'History curve will appear after adjusting parameters'}</div>
                    }
                    const w = 280
                    const h = 120
                    const padX = 30
                    const padY = 15
                    const chartW = w - padX * 2
                    const chartH = h - padY * 2

                    const allGamma = data.map(d => d.gamma)
                    const allGamma2 = data.map(d => d.Gamma)
                    const minVal = Math.min(...allGamma, ...allGamma2)
                    const maxVal = Math.max(...allGamma, ...allGamma2)
                    const rangeVal = maxVal - minVal || 1

                    const toX = (i: number) => padX + (i / (data.length - 1)) * chartW
                    const toY = (v: number) => padY + chartH - ((v - minVal) / rangeVal) * chartH

                    const gammaPoints = data.map((d, i) => `${toX(i)},${toY(d.gamma)}`).join(' ')
                    const gamma2Points = data.map((d, i) => `${toX(i)},${toY(d.Gamma)}`).join(' ')

                    // Gridlines
                    const gridLines: React.ReactNode[] = []
                    const gridCount = 4
                    for (let i = 0; i <= gridCount; i++) {
                      const y = padY + (i / gridCount) * chartH
                      const val = maxVal - (i / gridCount) * rangeVal
                      gridLines.push(
                        <g key={`grid-${i}`}>
                          <line x1={padX} y1={y} x2={w - padX} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                          <text x={padX - 3} y={y + 3} fill="rgba(255,255,255,0.25)" fontSize="7" textAnchor="end" fontFamily="monospace">{val.toFixed(1)}</text>
                        </g>
                      )
                    }

                    return (
                      <svg viewBox={`0 0 ${w} ${h}`} className="hypoid-history-chart" style={{ maxHeight: '140px' }}
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const x = ((e.clientX - rect.left) / rect.width) * w
                          const idx = Math.round(((x - padX) / chartW) * (data.length - 1))
                          setHistoryTooltipIdx(idx >= 0 && idx < data.length ? idx : null)
                        }}
                        onMouseLeave={() => setHistoryTooltipIdx(null)}
                      >
                        <rect x="0" y="0" width={w} height={h} fill="rgba(0,0,0,0.15)" rx="4" />
                        {gridLines}
                        {/* γ line */}
                        <polyline points={gammaPoints} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
                        {/* Γ line */}
                        <polyline points={gamma2Points} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
                        {/* Legend */}
                        <circle cx={padX + 5} cy={padY - 5} r="3" fill="#f59e0b" />
                        <text x={padX + 11} y={padY - 2} fill="#f59e0b" fontSize="7" fontFamily="monospace">γ</text>
                        <circle cx={padX + 30} cy={padY - 5} r="3" fill="#10b981" />
                        <text x={padX + 36} y={padY - 2} fill="#10b981" fontSize="7" fontFamily="monospace">Γ</text>
                        {/* Hover indicator */}
                        {historyTooltipIdx !== null && historyTooltipIdx >= 0 && historyTooltipIdx < data.length && (
                          <>
                            <line x1={toX(historyTooltipIdx)} y1={padY} x2={toX(historyTooltipIdx)} y2={padY + chartH} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" strokeDasharray="2 2" />
                            <circle cx={toX(historyTooltipIdx)} cy={toY(data[historyTooltipIdx].gamma)} r="3" fill="#f59e0b" />
                            <circle cx={toX(historyTooltipIdx)} cy={toY(data[historyTooltipIdx].Gamma)} r="3" fill="#10b981" />
                          </>
                        )}
                      </svg>
                    )
                  })()}
                  {historyTooltipIdx !== null && paramHistoryFull[historyTooltipIdx] && (
                    <div className="hypoid-history-tooltip" style={{ top: -30, left: '50%', transform: 'translateX(-50%)' }}>
                      <span style={{ color: '#f59e0b' }}>γ={paramHistoryFull[historyTooltipIdx].gamma.toFixed(2)}°</span>
                      <span style={{ margin: '0 6px', color: 'var(--hypoid-text-faint)' }}>|</span>
                      <span style={{ color: '#10b981' }}>Γ={paramHistoryFull[historyTooltipIdx].Gamma.toFixed(2)}°</span>
                    </div>
                  )}
                </div>
              </ExpandableSection>

              {/* Parameter Comparison Slider (Feature 4) */}
              <ExpandableSection label={t('expand.paramCompare', lang)} open={showParamCompare} onToggle={() => setShowParamCompare(!showParamCompare)} scrollContainerRef={panelScrollRef}>
                <div className="mt-1.5 space-y-2">
                  {/* Blend slider */}
                  <div className="p-2 rounded-lg border" style={{ background: 'var(--hypoid-bg-subtle)', borderColor: 'var(--hypoid-border-faint)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px]" style={{ color: 'var(--hypoid-text-dim)' }}>{t('compare.blend', lang)}</span>
                      <span className="text-[9px] font-mono" style={{ color: 'var(--hypoid-amber)' }}>{(compareBlend * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={compareBlend * 100}
                      onChange={(e) => setCompareBlend(parseInt(e.target.value) / 100)}
                      className="w-full hypoid-compare-slider"
                    />
                    <div className="flex justify-between text-[8px] mt-0.5" style={{ color: 'var(--hypoid-text-faint)' }}>
                      <span>{t('compare.current', lang)}</span>
                      <span>{t('compare.target', lang)}</span>
                    </div>
                  </div>

                  {/* Comparison parameter inputs */}
                  <div className="grid grid-cols-3 gap-1.5 text-[9px]">
                    <div className="p-1.5 rounded border text-center" style={{ background: 'var(--hypoid-bg-subtle)', borderColor: 'var(--hypoid-border-faint)' }}>
                      <div style={{ color: 'var(--hypoid-text-faint)' }}>{t('compare.sigmaComp', lang)}</div>
                      <input
                        type="number"
                        value={compareSigma}
                        onChange={(e) => setCompareSigma(Math.max(30, Math.min(150, parseInt(e.target.value) || 90)))}
                        className="hypoid-compare-input mt-0.5"
                      />
                    </div>
                    <div className="p-1.5 rounded border text-center" style={{ background: 'var(--hypoid-bg-subtle)', borderColor: 'var(--hypoid-border-faint)' }}>
                      <div style={{ color: 'var(--hypoid-text-faint)' }}>{t('compare.epComp', lang)}</div>
                      <input
                        type="number"
                        value={compareEp}
                        onChange={(e) => setCompareEp(Math.max(0.5, Math.min(8, parseFloat(e.target.value) || 3)))}
                        step="0.1"
                        className="hypoid-compare-input mt-0.5"
                      />
                    </div>
                    <div className="p-1.5 rounded border text-center" style={{ background: 'var(--hypoid-bg-subtle)', borderColor: 'var(--hypoid-border-faint)' }}>
                      <div style={{ color: 'var(--hypoid-text-faint)' }}>{t('compare.pComp', lang)}</div>
                      <input
                        type="number"
                        value={comparePRatio}
                        onChange={(e) => setComparePRatio(Math.max(0.1, Math.min(0.9, parseFloat(e.target.value) || 0.4)))}
                        step="0.01"
                        className="hypoid-compare-input mt-0.5"
                      />
                    </div>
                  </div>

                  {/* Comparison results */}
                  <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                    <div className="p-1.5 rounded border" style={{ background: 'var(--hypoid-bg-subtle)', borderColor: 'var(--hypoid-border-faint)' }}>
                      <div style={{ color: 'var(--hypoid-text-faint)' }}>γ</div>
                      <div className="flex items-center gap-1">
                        <span className="font-mono" style={{ color: '#f59e0b' }}>{(geo.gamma * 180 / Math.PI).toFixed(1)}°</span>
                        <span style={{ color: 'var(--hypoid-text-faint)' }}>→</span>
                        <span className="font-mono" style={{ color: '#10b981' }}>{(blendedGeo.gamma * 180 / Math.PI).toFixed(1)}°</span>
                      </div>
                    </div>
                    <div className="p-1.5 rounded border" style={{ background: 'var(--hypoid-bg-subtle)', borderColor: 'var(--hypoid-border-faint)' }}>
                      <div style={{ color: 'var(--hypoid-text-faint)' }}>Γ</div>
                      <div className="flex items-center gap-1">
                        <span className="font-mono" style={{ color: '#f59e0b' }}>{(geo.Gamma * 180 / Math.PI).toFixed(1)}°</span>
                        <span style={{ color: 'var(--hypoid-text-faint)' }}>→</span>
                        <span className="font-mono" style={{ color: '#10b981' }}>{(blendedGeo.Gamma * 180 / Math.PI).toFixed(1)}°</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ExpandableSection>
            </div>

            <Separator style={{ background: 'var(--hypoid-border-faint)' }} />

            {/* Legend */}
            <div>
              <h3 className="hypoid-section-header text-[10px] font-semibold mb-2 uppercase tracking-[0.2em]" style={{ color: 'var(--hypoid-text-dim)' }}>{t('section.legend', lang)}</h3>
              <div className="space-y-1 text-[10px]">
                {[
                  { color: 'bg-amber-500', type: 'line', label: t('legend.smallCone', lang) },
                  { color: 'bg-emerald-500', type: 'line', label: t('legend.largeCone', lang) },
                  { color: 'bg-white', type: 'line', label: t('legend.kline', lang) },
                  { color: 'bg-red-500', type: 'dot', label: t('legend.node', lang) },
                  { color: 'bg-yellow-400', type: 'dot', label: `H₁ (${lang === 'zh' ? '小轮轴 ∩ 平面T' : 'Pinion ∩ Plane T'})` },
                  { color: 'bg-emerald-400', type: 'dot', label: `H₂ (${lang === 'zh' ? '大轮轴 ∩ 平面T' : 'Gear ∩ Plane T'})` },
                  { color: 'bg-blue-500/30', type: 'plane', label: t('legend.plane', lang) },
                  { color: 'bg-purple-400', type: 'dot', label: `K₁, K₂ (${lang === 'zh' ? '轴线连接点' : 'Axis Points'})` },
                  { color: 'bg-pink-400', type: 'line', label: `Σ / ${lang === 'zh' ? '偏置角' : 'Offset Angle'}` },
                  { color: 'bg-amber-400', type: 'circle', label: `Rₚ (${lang === 'zh' ? '小轮节圆' : 'Pinion Circle'})` },
                  { color: 'bg-emerald-400', type: 'circle', label: `R (${lang === 'zh' ? '大轮节圆' : 'Gear Circle'})` },
                  { color: 'bg-indigo-500', type: 'line', label: `|VpVg| (${lang === 'zh' ? '顶点连线' : 'Vertex Line'})` },
                  { color: 'bg-slate-400', type: 'dot', label: `O₁, O₂ (${lang === 'zh' ? '公垂线垂足' : 'Common Perp.'})` },
                  { color: 'bg-slate-400', type: 'line', label: t('legend.comparison', lang) },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {item.type === 'line' && <div className={`w-4 h-[2px] ${item.color} rounded-full`} />}
                    {item.type === 'dot' && <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />}
                    {item.type === 'plane' && <div className={`w-4 h-4 ${item.color} border border-blue-400/30 rounded-sm`} />}
                    {item.type === 'circle' && <div className={`w-3 h-3 rounded-full border-[1.5px] border-dashed ${item.color.replace('bg-', 'border-')} opacity-70`} />}
                    <span style={{ color: 'var(--hypoid-text-dim)' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hypoid-separator-gradient" />

            {/* Key formulas */}
            <div className="hypoid-section-hover p-1 -m-1">
              <h3 className="hypoid-section-header text-[10px] font-semibold mb-2 uppercase tracking-[0.2em]" style={{ color: 'var(--hypoid-text-dim)' }}>{t('section.formulas', lang)}</h3>
              <div className="space-y-1.5 text-[10px] font-mono p-2.5 rounded-lg border" style={{ background: 'var(--hypoid-bg-subtle)', borderColor: 'var(--hypoid-border-faint)' }}>
                <div className="text-purple-400/60">tan η = Eₚ / (Q·sin Σ)</div>
                <div className="text-cyan-400/60">sin ε = (Eₚ - Rₚ·sin η) / R</div>
                <div className="pt-1 border-t" style={{ borderColor: 'var(--hypoid-border-faint)' }}>
                  <div className="text-emerald-400/60">tan Γ = sin ε/(tan η·sin Σ) - cos ε·cot Σ</div>
                  <div className="text-amber-400/60">tan γ = sin η/(tan ε·sin Σ) - cos η·cot Σ</div>
                </div>
                <div className="pt-1 border-t" style={{ borderColor: 'var(--hypoid-border-faint)' }}>
                  <div className="text-pink-400/60">sin ε&apos; = sin Σ·sin ε / cos γ</div>
                  <div style={{ color: 'var(--hypoid-text-faint)' }}>sin ε&apos; = sin Σ·sin η / cos Γ</div>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll to top floating button */}
          {panelScrolled && (
            <button
              className="hypoid-scroll-top-btn"
              onClick={() => {
                panelScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              ↑
            </button>
          )}
        </div>
        )}
      </div>

      {/* Help Modal */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="bg-[#0d0d14]/95 border-white/10 text-white backdrop-blur-xl max-w-lg max-h-[80vh] overflow-y-auto hypoid-panel-scroll">
          <DialogHeader>
            <DialogTitle className="text-white/90 text-base">{t('help.title', lang)}</DialogTitle>
            <DialogDescription className="text-white/30 text-xs">
              {lang === 'zh' ? '了解所有可用的键盘快捷键和功能' : 'Learn all available keyboard shortcuts and features'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <h4 className="text-amber-400/70 text-xs font-semibold mb-2 flex items-center gap-2">
                <span className="w-1 h-3 rounded-sm bg-amber-400/60" />
                {t('help.shortcuts', lang)}
              </h4>
              <div className="space-y-1">
                {[
                  { key: 'Space', desc: t('help.key.space', lang) },
                  { key: 'R', desc: t('help.key.r', lang) },
                  { key: 'C', desc: t('help.key.c', lang) },
                  { key: 'A', desc: t('help.key.a', lang) },
                  { key: 'F', desc: t('help.key.f', lang) },
                  { key: 'Esc', desc: t('help.key.esc', lang) },
                  { key: '1-4', desc: t('help.key.1-4', lang) },
                  { key: 'Ctrl+Z', desc: t('help.key.ctrlZ', lang) },
                  { key: 'Ctrl+Shift+Z', desc: t('help.key.ctrlShiftZ', lang) },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1 px-2 rounded hover:bg-white/[0.03] transition-colors">
                    <span className="text-white/50 text-[11px]">{s.desc}</span>
                    <kbd className="hypoid-kbd">{s.key}</kbd>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-emerald-400/70 text-xs font-semibold mb-2 flex items-center gap-2">
                <span className="w-1 h-3 rounded-sm bg-emerald-400/60" />
                {t('help.features', lang)}
              </h4>
              <div className="space-y-1">
                {[
                  { icon: '🎯', desc: t('help.feature.3d', lang) },
                  { icon: '🎚️', desc: t('help.feature.params', lang) },
                  { icon: '📐', desc: t('help.feature.steps', lang) },
                  { icon: '📋', desc: t('help.feature.presets', lang) },
                  { icon: '📏', desc: t('help.feature.measure', lang) },
                  { icon: '🔄', desc: t('help.feature.compare', lang) },
                  { icon: '📊', desc: t('help.feature.sweep', lang) },
                  { icon: '🔗', desc: t('help.feature.share', lang) },
                  { icon: '💾', desc: t('help.feature.save', lang) },
                  { icon: '📸', desc: t('help.feature.screenshot', lang) },
                  { icon: '↩️', desc: t('help.feature.undo', lang) },
                  { icon: '⛶', desc: t('help.feature.fullscreen', lang) },
                  { icon: '🌐', desc: t('help.feature.i18n', lang) },
                  { icon: '⚙️', desc: t('help.feature.involute', lang) },
                  { icon: '📄', desc: t('help.feature.unroll', lang) },
                  { icon: '📝', desc: t('help.feature.derivation', lang) },
                  { icon: '📈', desc: t('help.feature.graph', lang) },
                  { icon: '🗺️', desc: t('help.feature.heatmap', lang) },
                  { icon: '⚙', desc: t('help.feature.meshing', lang) },
                  { icon: '🎨', desc: t('help.feature.theme', lang) },
                  { icon: '🎯', desc: t('help.feature.freeclick', lang) },
                  { icon: '🎬', desc: t('help.feature.record', lang) },
                  { icon: '🔬', desc: t('help.feature.tolerance', lang) },
                  { icon: '📈', desc: t('help.feature.paramHistory', lang) },
                  { icon: '🔴', desc: t('help.feature.contactEllipse', lang) },
                  { icon: '📥', desc: t('help.feature.svgExport', lang) },
                  { icon: '🌀', desc: t('help.feature.helical', lang) },
                  { icon: '🧭', desc: t('help.feature.compass', lang) },
                  { icon: '🔄', desc: t('help.feature.paramCompare', lang) },
                  { icon: '📄', desc: t('help.feature.report', lang) },
                  { icon: '⚡', desc: t('help.feature.forceVectors', lang) },
                  { icon: '✂️', desc: t('help.feature.cutaway', lang) },
                  { icon: '🔧', desc: t('help.feature.assembly', lang) },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-white/[0.03] transition-colors">
                    <span className="text-[11px]">{f.icon}</span>
                    <span className="text-white/50 text-[11px]">{f.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className={`hypoid-footer-separator ${isFullscreen ? 'hidden' : ''}`} />
      <footer className={`border-t px-4 py-1.5 text-center text-[10px] flex-shrink-0 bg-gradient-to-r from-[var(--hypoid-header-gradient-from)]/50 via-[var(--hypoid-header-gradient-via)]/50 to-[var(--hypoid-header-gradient-to)]/50 ${isFullscreen ? 'hidden' : ''}`} style={{ borderColor: 'var(--hypoid-border-faint)', color: 'var(--hypoid-text-faint)' }}>
        <span className="inline-flex items-center gap-3 flex-wrap justify-center">
          <span className="hypoid-footer-item">
            <span className="hypoid-footer-dot" style={{ background: fps > 50 ? '#10b981' : fps > 30 ? '#f59e0b' : '#ef4444' }} />
            {t('footer.fps', lang)} {fps}
          </span>
          <span style={{ color: 'var(--hypoid-border-faint)' }}>|</span>
          <span className="hypoid-footer-item">
            <span className="hypoid-footer-dot" style={{ background: themeColors[theme] }} />
            {t('footer.theme', lang)}: {t(`theme.${theme}`, lang)}
          </span>
          <span style={{ color: 'var(--hypoid-border-faint)' }}>|</span>
          <span className="hypoid-footer-item">
            {t('footer.steps', lang)}: {steps.filter(Boolean).length}{t('footer.of', lang)}7
          </span>
          <span style={{ color: 'var(--hypoid-border-faint)' }}>|</span>
          <span className="hypoid-footer-item">
            <span style={{ color: '#f59e0b' }}>γ</span>={gammaDeg}°
            <span style={{ color: 'var(--hypoid-border-faint)', margin: '0 2px' }}>·</span>
            <span style={{ color: '#10b981' }}>Γ</span>={GammaDeg}°
          </span>
          <span style={{ color: 'var(--hypoid-border-faint)' }}>|</span>
          <span className="hypoid-footer-item">
            🖱️ {t('footer.orbit', lang)}
          </span>
          <span style={{ color: 'var(--hypoid-border-faint)' }}>|</span>
          <span className="hidden md:inline">{lang === 'zh' ? '⌨️ 空格·R·C·A·F·Ctrl+Z·Esc·1-4' : '⌨️ Space·R·C·A·F·Ctrl+Z·Esc·1-4'}</span>
          <span className="md:hidden">{lang === 'zh' ? '⌨️ 快捷键' : '⌨️ Shortcuts'}</span>
        </span>
      </footer>

      {/* Copy-to-clipboard toast */}
      {copiedValue && (
        <div className="hypoid-copy-toast">
          ✓ {copiedValue} {lang === 'zh' ? '已复制' : 'Copied'}
        </div>
      )}
    </div>
  )
}
