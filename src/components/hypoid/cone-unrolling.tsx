'use client'

import { useMemo } from 'react'

interface ConeUnrollingProps {
  gamma: number // small cone angle (rad)
  Gamma: number // large cone angle (rad)
  Rp: number // small pitch radius
  R: number // large pitch radius
  Ap: number // small cone distance
  A: number // large cone distance
}

export function ConeUnrolling({ gamma, Gamma, Rp, R, Ap, A }: ConeUnrollingProps) {
  const svg = useMemo(() => {
    // When a cone is unrolled, it becomes a circular sector
    // Arc length = 2π × radius (base circle radius)
    // Radius of the sector = slant height (cone distance)
    // Sector angle = arc_length / slant_height = 2π × base_radius / slant_height = 2π × sin(cone_angle)

    // Small cone (pinion)
    const smallSlant = Ap // slant height = cone distance
    const smallArc = 2 * Math.PI * Rp // arc length at base
    const smallSectorAngle = smallArc / Math.max(smallSlant, 0.01) // radians
    const smallSectorDeg = smallSectorAngle * 180 / Math.PI

    // Large cone (gear)
    const largeSlant = A
    const largeArc = 2 * Math.PI * R
    const largeSectorAngle = largeArc / Math.max(largeSlant, 0.01)
    const largeSectorDeg = largeSectorAngle * 180 / Math.PI

    return {
      small: { slant: smallSlant, sectorAngle: smallSectorAngle, sectorDeg: smallSectorDeg, arc: smallArc },
      large: { slant: largeSlant, sectorAngle: largeSectorAngle, sectorDeg: largeSectorDeg, arc: largeArc },
    }
  }, [gamma, Gamma, Rp, R, Ap, A])

  const { small, large } = svg

  // SVG drawing dimensions
  const W = 280
  const H = 200
  const cx = W / 2
  const cy = 20

  // Scale to fit
  const maxSlant = Math.max(small.slant, large.slant, 1)
  const scale = Math.min((H - 40) / maxSlant, (W / 2 - 20) / maxSlant)

  // Draw a sector: from center (cx, cy), radius = slant * scale, angle = sectorAngle
  const drawSector = (slant: number, sectorAngle: number, offsetX: number, color: string, label: string) => {
    const r = slant * scale
    const startAngle = -sectorAngle / 2
    const endAngle = sectorAngle / 2
    const startX = offsetX + r * Math.sin(startAngle)
    const startY = cy + r * Math.cos(startAngle)
    const endX = offsetX + r * Math.sin(endAngle)
    const endY = cy + r * Math.cos(endAngle)
    const largeArc = sectorAngle > Math.PI ? 1 : 0

    // Arc path
    const arcPath = sectorAngle >= 2 * Math.PI - 0.01
      ? `M ${offsetX} ${cy} m ${-r} 0 a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`
      : `M ${offsetX} ${cy} L ${startX.toFixed(1)} ${startY.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 ${largeArc} 0 ${endX.toFixed(1)} ${endY.toFixed(1)} Z`

    // Pitch circle (at the base, radius Rp or R scaled)
    const pitchR = (sectorAngle >= 2 * Math.PI - 0.01)
      ? r
      : r // The full slant height

    return (
      <g key={label}>
        {/* Filled sector */}
        <path d={arcPath} fill={`${color}10`} stroke={color} strokeWidth="1.2" opacity="0.6" />
        {/* Radial lines */}
        {sectorAngle < 2 * Math.PI - 0.01 && (
          <>
            <line x1={offsetX} y1={cy} x2={startX.toFixed(1)} y2={startY.toFixed(1)} stroke={color} strokeWidth="0.8" opacity="0.4" />
            <line x1={offsetX} y1={cy} x2={endX.toFixed(1)} y2={endY.toFixed(1)} stroke={color} strokeWidth="0.8" opacity="0.4" />
          </>
        )}
        {/* Center point */}
        <circle cx={offsetX} cy={cy} r="2" fill={color} opacity="0.8" />
        {/* Label */}
        <text
          x={offsetX}
          y={cy + r + 14}
          fill={color}
          fontSize="8"
          textAnchor="middle"
          fontFamily="serif"
          opacity="0.7"
        >
          {label}
        </text>
        {/* Sector angle annotation */}
        <text
          x={offsetX}
          y={cy + r + 24}
          fill={color}
          fontSize="6"
          textAnchor="middle"
          fontFamily="monospace"
          opacity="0.5"
        >
          {sectorAngle < 2 * Math.PI - 0.01 ? `${(sectorAngle * 180 / Math.PI).toFixed(0)}°` : '360°'}
        </text>
      </g>
    )
  }

  return (
    <div className="mt-1.5 p-2 rounded-lg bg-white/[0.015] border border-white/[0.04]">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[9px] text-white/25">节锥面展开图（可展曲面→平面扇形）</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: '210px' }}>
        <rect x="0" y="0" width={W} height={H} fill="rgba(0,0,0,0.2)" rx="4" />

        {/* Small cone sector (left half) */}
        {drawSector(small.slant, small.sectorAngle, W * 0.3, '#fbbf24', `小轮 (γ=${(gamma * 180 / Math.PI).toFixed(1)}°)`)}

        {/* Large cone sector (right half) */}
        {drawSector(large.slant, large.sectorAngle, W * 0.7, '#34d399', `大轮 (Γ=${(Gamma * 180 / Math.PI).toFixed(1)}°)`)}

        {/* Legend */}
        <line x1="8" y1={H - 8} x2="20" y2={H - 8} stroke="#fbbf24" strokeWidth="1.2" />
        <text x="23" y={H - 6} fill="#fbbf24" fontSize="6" fontFamily="serif" opacity="0.7">小轮扇形</text>
        <line x1="60" y1={H - 8} x2="72" y2={H - 8} stroke="#34d399" strokeWidth="1.2" />
        <text x="75" y={H - 6} fill="#34d399" fontSize="6" fontFamily="serif" opacity="0.7">大轮扇形</text>

        {/* Formula hint */}
        <text x={W - 8} y={H - 6} fill="rgba(255,255,255,0.2)" fontSize="5" textAnchor="end" fontFamily="monospace">
          扇形角 = 2π·R/A
        </text>
      </svg>
    </div>
  )
}
