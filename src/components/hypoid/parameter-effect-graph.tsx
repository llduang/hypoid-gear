'use client'

import { useMemo } from 'react'
import { computeHypoidAngles } from '@/lib/hypoid-geometry'

interface ParameterEffectGraphProps {
  sigma: number
  ep: number
  pRatio: number
  mode: 'ep' | 'sigma'
  onModeChange: (mode: 'ep' | 'sigma') => void
}

export function ParameterEffectGraph({
  sigma,
  ep,
  pRatio,
  mode,
  onModeChange,
}: ParameterEffectGraphProps) {
  const sampleCount = 25

  const data = useMemo(() => {
    const results: { x: number; gamma: number; Gamma: number }[] = []
    for (let i = 0; i <= sampleCount; i++) {
      let s = sigma
      let e = ep
      const t = i / sampleCount

      if (mode === 'ep') {
        e = 0.5 + t * 7.5 // 0.5 to 8.0
      } else {
        s = 30 + t * 120 // 30 to 150
      }

      try {
        const angles = computeHypoidAngles(s, e, pRatio)
        results.push({
          x: mode === 'ep' ? e : s,
          gamma: angles.gamma * 180 / Math.PI,
          Gamma: angles.Gamma * 180 / Math.PI,
        })
      } catch {
        // skip invalid params
      }
    }
    return results
  }, [sigma, ep, pRatio, mode, sampleCount])

  if (data.length < 2) return null

  // Chart dimensions
  const W = 280
  const H = 140
  const padL = 30
  const padR = 10
  const padT = 15
  const padB = 22
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  // Find ranges
  const xMin = mode === 'ep' ? 0.5 : 30
  const xMax = mode === 'ep' ? 8.0 : 150
  const yMin = Math.min(...data.map(d => Math.min(d.gamma, d.Gamma))) - 3
  const yMax = Math.max(...data.map(d => Math.max(d.gamma, d.Gamma))) + 3
  const yRange = yMax - yMin || 1

  const toSvgX = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * chartW
  const toSvgY = (y: number) => padT + chartH - ((y - yMin) / yRange) * chartH

  // Current value marker
  const currentX = mode === 'ep' ? ep : sigma

  // Build path strings
  const gammaPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toSvgX(d.x).toFixed(1)},${toSvgY(d.gamma).toFixed(1)}`).join(' ')
  const gammaPathLarge = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toSvgX(d.x).toFixed(1)},${toSvgY(d.Gamma).toFixed(1)}`).join(' ')

  // Y-axis ticks
  const yTicks = 5
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (yRange * i) / yTicks)

  // X-axis ticks
  const xTicks = mode === 'ep' ? [1, 2, 3, 4, 5, 6, 7, 8] : [30, 60, 90, 120, 150]

  // Read current values at the marker
  const closestData = data.reduce((prev, curr) =>
    Math.abs(curr.x - currentX) < Math.abs(prev.x - currentX) ? curr : prev
  )

  return (
    <div className="mt-1.5 p-2 rounded-lg bg-white/[0.015] border border-white/[0.04]">
      {/* Mode toggle */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[9px] text-white/25">X轴:</span>
        <button
          onClick={() => onModeChange('ep')}
          className={`text-[9px] px-1.5 py-0.5 rounded transition-all ${
            mode === 'ep'
              ? 'bg-white/10 text-white/70 border border-white/20'
              : 'text-white/30 hover:text-white/50'
          }`}
        >
          Eₚ
        </button>
        <button
          onClick={() => onModeChange('sigma')}
          className={`text-[9px] px-1.5 py-0.5 rounded transition-all ${
            mode === 'sigma'
              ? 'bg-white/10 text-white/70 border border-white/20'
              : 'text-white/30 hover:text-white/50'
          }`}
        >
          Σ
        </button>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: '150px' }}>
        {/* Background */}
        <rect x="0" y="0" width={W} height={H} fill="rgba(0,0,0,0.2)" rx="4" />

        {/* Grid lines */}
        {yTickValues.map((v, i) => (
          <line
            key={`yg-${i}`}
            x1={padL}
            y1={toSvgY(v)}
            x2={W - padR}
            y2={toSvgY(v)}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="0.5"
          />
        ))}
        {xTicks.map((v, i) => (
          <line
            key={`xg-${i}`}
            x1={toSvgX(v)}
            y1={padT}
            x2={toSvgX(v)}
            y2={padT + chartH}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="0.5"
          />
        ))}

        {/* Y-axis labels */}
        {yTickValues.filter((_, i) => i % 2 === 0).map((v, i) => (
          <text
            key={`yl-${i}`}
            x={padL - 3}
            y={toSvgY(v) + 3}
            fill="rgba(255,255,255,0.25)"
            fontSize="6"
            textAnchor="end"
            fontFamily="monospace"
          >
            {v.toFixed(0)}°
          </text>
        ))}

        {/* X-axis labels */}
        {xTicks.map((v, i) => (
          <text
            key={`xl-${i}`}
            x={toSvgX(v)}
            y={padT + chartH + 12}
            fill="rgba(255,255,255,0.25)"
            fontSize="6"
            textAnchor="middle"
            fontFamily="monospace"
          >
            {v}{mode === 'sigma' ? '°' : ''}
          </text>
        ))}

        {/* γ curve (amber) */}
        <path d={gammaPath} fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.8" />

        {/* Γ curve (green) */}
        <path d={gammaPathLarge} fill="none" stroke="#34d399" strokeWidth="1.5" opacity="0.8" />

        {/* Current value marker line */}
        <line
          x1={toSvgX(currentX)}
          y1={padT}
          x2={toSvgX(currentX)}
          y2={padT + chartH}
          stroke="rgba(239,68,68,0.6)"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {/* Current value dots */}
        {closestData && (
          <>
            <circle
              cx={toSvgX(currentX)}
              cy={toSvgY(closestData.gamma)}
              r="3"
              fill="#fbbf24"
              stroke="rgba(0,0,0,0.5)"
              strokeWidth="0.5"
            />
            <circle
              cx={toSvgX(currentX)}
              cy={toSvgY(closestData.Gamma)}
              r="3"
              fill="#34d399"
              stroke="rgba(0,0,0,0.5)"
              strokeWidth="0.5"
            />
          </>
        )}

        {/* Legend */}
        <line x1={padL + 2} y1={padT + 4} x2={padL + 14} y2={padT + 4} stroke="#fbbf24" strokeWidth="1.5" />
        <text x={padL + 17} y={padT + 6} fill="#fbbf24" fontSize="6" fontFamily="serif">γ (小轮)</text>
        <line x1={padL + 52} y1={padT + 4} x2={padL + 64} y2={padT + 4} stroke="#34d399" strokeWidth="1.5" />
        <text x={padL + 67} y={padT + 6} fill="#34d399" fontSize="6" fontFamily="serif">Γ (大轮)</text>
      </svg>
    </div>
  )
}
