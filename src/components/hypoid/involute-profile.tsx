'use client'

import { useMemo } from 'react'
import type { HypoidGeometry } from '@/lib/hypoid-geometry'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'

interface InvoluteProfileProps {
  geo: HypoidGeometry
  lang: Lang
}

function InvoluteWheel({ geo, isSmall, lang }: { geo: HypoidGeometry; isSmall: boolean; lang: Lang }) {
  const coneAngle = isSmall ? geo.gamma : geo.Gamma
  const pitchRadius = isSmall ? geo.Rp : geo.R
  const label = isSmall ? t('involute.small', lang) : t('involute.large', lang)
  const color = isSmall ? '#f59e0b' : '#10b981'
  const colorFaded = isSmall ? '#f59e0b66' : '#10b98166'

  // Derived parameters for involute
  const gearModule = 1
  const toothCount = Math.max(Math.round(pitchRadius / gearModule), 8)
  const baseRadius = pitchRadius * Math.cos(coneAngle)
  const addendumRadius = pitchRadius + gearModule
  const dedendumRadius = Math.max(pitchRadius - 1.25 * gearModule, baseRadius * 0.8)

  // Generate involute curve
  const involutePoints = useMemo(() => {
    const points: { x: number; y: number }[] = []
    const maxAngle = Math.sqrt(Math.max(addendumRadius * addendumRadius - baseRadius * baseRadius, 0)) / Math.max(baseRadius, 0.01)
    for (let i = 0; i <= 40; i++) {
      const theta = maxAngle * i / 40
      const r = baseRadius * Math.sqrt(1 + theta * theta)
      if (r > addendumRadius * 1.1) break
      const x = baseRadius * (Math.cos(theta) + theta * Math.sin(theta))
      const y = baseRadius * (Math.sin(theta) - theta * Math.cos(theta))
      points.push({ x, y })
    }
    return points
  }, [baseRadius, addendumRadius])

  // SVG size
  const svgSize = 140
  const center = svgSize / 2
  const scale = (svgSize * 0.4) / Math.max(addendumRadius, 1)

  const toSvg = (x: number, y: number) => `${center + x * scale},${center - y * scale}`

  // Generate single tooth profile path
  const toothPath = useMemo(() => {
    if (involutePoints.length < 2) return ''
    // Mirror involute for other side of tooth
    const toothAngle = Math.PI / toothCount
    const halfAngle = toothAngle * 0.45
    const s = scale
    const cx = center
    const cy = center
    const toSvgLocal = (x: number, y: number) => `${cx + x * s},${cy - y * s}`

    const rightSide = involutePoints.map(p => {
      const r = Math.sqrt(p.x * p.x + p.y * p.y)
      const angle = Math.atan2(p.y, p.x) + halfAngle
      return { x: r * Math.cos(angle), y: r * Math.sin(angle) }
    })
    const leftSide = involutePoints.map(p => {
      const r = Math.sqrt(p.x * p.x + p.y * p.y)
      const angle = -Math.atan2(p.y, p.x) + halfAngle
      return { x: r * Math.cos(angle), y: r * Math.sin(angle) }
    })

    let d = ''
    // Right involute
    rightSide.forEach((p, i) => {
      d += (i === 0 ? 'M' : 'L') + toSvgLocal(p.x, p.y) + ' '
    })
    // Top arc
    const firstL = leftSide[0]
    d += `A${addendumRadius * s},${addendumRadius * s} 0 0,1 ${toSvgLocal(firstL.x, firstL.y)} `
    // Left involute (reversed)
    leftSide.reverse().forEach((p) => {
      d += 'L' + toSvgLocal(p.x, p.y) + ' '
    })
    // Bottom arc back to start
    d += `A${dedendumRadius * s},${dedendumRadius * s} 0 0,1 ${toSvgLocal(rightSide[0].x, rightSide[0].y)} `
    d += 'Z'
    return d
  }, [involutePoints, toothCount, addendumRadius, dedendumRadius, scale, center])

  // Circle helpers
  const circlePath = (r: number) => {
    const sr = r * scale
    return `M${center - sr},${center} A${sr},${sr} 0 1,1 ${center + sr},${center} A${sr},${sr} 0 1,1 ${center - sr},${center}`
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
        {/* Background */}
        <circle cx={center} cy={center} r={addendumRadius * scale + 5} fill="rgba(255,255,255,0.02)" stroke="none" />

        {/* Dedendum circle */}
        <path d={circlePath(dedendumRadius)} fill="none" stroke={colorFaded} strokeWidth="0.5" strokeDasharray="2,2" />

        {/* Base circle */}
        <path d={circlePath(baseRadius)} fill="none" stroke={`${color}44`} strokeWidth="0.8" strokeDasharray="3,2" />

        {/* Pitch circle */}
        <path d={circlePath(pitchRadius)} fill="none" stroke={color} strokeWidth="1" />

        {/* Addendum circle */}
        <path d={circlePath(addendumRadius)} fill="none" stroke={`${color}88`} strokeWidth="0.5" />

        {/* Multiple teeth */}
        {toothPath && Array.from({ length: Math.min(toothCount, 20) }, (_, i) => {
          const angle = (360 * i / toothCount)
          return (
            <path
              key={i}
              d={toothPath}
              fill={`${color}15`}
              stroke={color}
              strokeWidth="0.6"
              transform={`rotate(${angle} ${center} ${center})`}
            />
          )
        })}

        {/* Center dot */}
        <circle cx={center} cy={center} r="1.5" fill={color} opacity="0.5" />

        {/* Labels */}
        <text x={center} y={svgSize - 4} textAnchor="middle" fill={color} fontSize="9" fontFamily="sans-serif" opacity="0.7">
          {label}
        </text>
      </svg>
      <div className="text-[8px] text-white/25 mt-0.5 text-center space-y-0">
        <div>{t('involute.toothCount', lang)}: {toothCount} · {t('involute.module', lang)}: {gearModule}</div>
        <div>R{isSmall ? 'ₚ' : ''}={pitchRadius.toFixed(1)} rb={baseRadius.toFixed(1)}</div>
      </div>
    </div>
  )
}

export function InvoluteProfile({ geo, lang }: InvoluteProfileProps) {
  return (
    <div className="mt-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
      <div className="flex justify-center gap-2">
        <InvoluteWheel geo={geo} isSmall={true} lang={lang} />
        <InvoluteWheel geo={geo} isSmall={false} lang={lang} />
      </div>
      <div className="flex justify-center gap-4 mt-1 text-[8px] text-white/20">
        <span>--- {t('involute.baseCircle', lang)}</span>
        <span>— {t('involute.pitchCircle', lang)}</span>
        <span>··· {t('involute.dedendumCircle', lang)}</span>
      </div>
    </div>
  )
}
