'use client'

import { useMemo, useCallback } from 'react'
import { computeHypoidAngles } from '@/lib/hypoid-geometry'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'

interface SensitivityHeatmapProps {
  sigma: number
  ep: number
  pRatio: number
  viewMode: 'gamma' | 'Gamma'
  onViewModeChange: (mode: 'gamma' | 'Gamma') => void
  onSetParams: (sigma: number, ep: number) => void
  lang: Lang
}

const GRID_SIZE = 20
const EP_MIN = 0.5
const EP_MAX = 8
const SIGMA_MIN = 30
const SIGMA_MAX = 150

function valueToColor(value: number, minVal: number, maxVal: number, isPaper: boolean): string {
  const t_val = maxVal > minVal ? (value - minVal) / (maxVal - minVal) : 0.5

  // Cool (blue/teal) for small values → warm (amber/red) for large values
  const r = Math.round(t_val * 220 + (1 - t_val) * 30)
  const g = Math.round(t_val < 0.5 ? t_val * 2 * 200 : (1 - t_val) * 2 * 200)
  const b = Math.round((1 - t_val) * 220 + t_val * 30)

  if (isPaper) {
    // Slightly more saturated for paper theme
    const r2 = Math.min(255, r + 20)
    const g2 = Math.min(255, g + 10)
    const b2 = Math.min(255, b + 20)
    return `rgb(${r2},${g2},${b2})`
  }

  return `rgb(${r},${g},${b})`
}

export function SensitivityHeatmap({
  sigma,
  ep,
  pRatio,
  viewMode,
  onViewModeChange,
  onSetParams,
  lang,
}: SensitivityHeatmapProps) {
  // Compute heatmap grid
  const { grid, minVal, maxVal } = useMemo(() => {
    const data: number[][] = []
    let mn = Infinity
    let mx = -Infinity

    for (let row = 0; row < GRID_SIZE; row++) {
      const rowData: number[] = []
      const sigmaVal = SIGMA_MAX - (row / (GRID_SIZE - 1)) * (SIGMA_MAX - SIGMA_MIN)
      for (let col = 0; col < GRID_SIZE; col++) {
        const epVal = EP_MIN + (col / (GRID_SIZE - 1)) * (EP_MAX - EP_MIN)
        try {
          const angles = computeHypoidAngles(sigmaVal, epVal, pRatio)
          const val = (viewMode === 'gamma' ? angles.gamma : angles.Gamma) * 180 / Math.PI
          rowData.push(val)
          if (isFinite(val)) {
            mn = Math.min(mn, val)
            mx = Math.max(mx, val)
          }
        } catch {
          rowData.push(NaN)
        }
      }
      data.push(rowData)
    }

    if (!isFinite(mn)) mn = 0
    if (!isFinite(mx)) mx = 90

    return { grid: data, minVal: mn, maxVal: mx }
  }, [pRatio, viewMode])

  // SVG dimensions
  const svgW = 260
  const svgH = 200
  const padL = 36
  const padR = 14
  const padT = 14
  const padB = 28
  const plotW = svgW - padL - padR
  const plotH = svgH - padT - padB
  const cellW = plotW / GRID_SIZE
  const cellH = plotH / GRID_SIZE

  const handleHeatmapClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const col = Math.floor((x - padL) / cellW)
      const row = Math.floor((y - padT) / cellH)
      if (col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE) {
        const newEp = EP_MIN + (col / (GRID_SIZE - 1)) * (EP_MAX - EP_MIN)
        const newSigma = SIGMA_MAX - (row / (GRID_SIZE - 1)) * (SIGMA_MAX - SIGMA_MIN)
        onSetParams(Math.round(newSigma), Math.round(newEp * 10) / 10)
      }
    },
    [cellW, cellH, onSetParams]
  )

  // Current parameter position on heatmap
  const curCol = Math.round(((ep - EP_MIN) / (EP_MAX - EP_MIN)) * (GRID_SIZE - 1))
  const curRow = Math.round(((SIGMA_MAX - sigma) / (SIGMA_MAX - SIGMA_MIN)) * (GRID_SIZE - 1))
  const curX = padL + curCol * cellW + cellW / 2
  const curY = padT + curRow * cellH + cellH / 2

  const isPaperTheme = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'paper'
  const textColor = isPaperTheme ? 'rgba(30,30,30,0.5)' : 'rgba(255,255,255,0.4)'
  const axisTextColor = isPaperTheme ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.5)'

  return (
    <div className="mt-1.5 p-2 rounded-lg border" style={{
      borderColor: isPaperTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)',
      background: isPaperTheme ? 'rgba(0,0,0,0.015)' : 'rgba(255,255,255,0.015)',
    }}>
      {/* Toggle between γ and Γ */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => onViewModeChange('gamma')}
          className={`px-2 py-0.5 text-[9px] rounded border transition-all ${
            viewMode === 'gamma'
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              : 'border-white/10 text-white/30 hover:text-white/50'
          }`}
          style={isPaperTheme ? { color: viewMode === 'gamma' ? '#b45309' : 'rgba(30,30,30,0.35)', borderColor: viewMode === 'gamma' ? 'rgba(180,83,9,0.4)' : 'rgba(0,0,0,0.1)' } : undefined}
        >
          {t('heatmap.viewGamma', lang)}
        </button>
        <button
          onClick={() => onViewModeChange('Gamma')}
          className={`px-2 py-0.5 text-[9px] rounded border transition-all ${
            viewMode === 'Gamma'
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              : 'border-white/10 text-white/30 hover:text-white/50'
          }`}
          style={isPaperTheme ? { color: viewMode === 'Gamma' ? '#059669' : 'rgba(30,30,30,0.35)', borderColor: viewMode === 'Gamma' ? 'rgba(5,150,105,0.4)' : 'rgba(0,0,0,0.1)' } : undefined}
        >
          {t('heatmap.viewGammaLarge', lang)}
        </button>
        <span className="text-[8px] ml-auto" style={{ color: textColor }}>
          {t('heatmap.clickHint', lang)}
        </span>
      </div>

      {/* Heatmap SVG */}
      <svg
        width="100%"
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ cursor: 'crosshair', maxHeight: '200px' }}
        onClick={handleHeatmapClick}
      >
        {/* Grid cells */}
        {grid.map((row, ri) =>
          row.map((val, ci) => (
            <rect
              key={`${ri}-${ci}`}
              x={padL + ci * cellW}
              y={padT + ri * cellH}
              width={cellW + 0.5}
              height={cellH + 0.5}
              fill={isFinite(val) ? valueToColor(val, minVal, maxVal, isPaperTheme) : 'rgba(128,128,128,0.2)'}
              opacity={0.8}
            />
          ))
        )}

        {/* X-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const epVal = EP_MIN + frac * (EP_MAX - EP_MIN)
          const x = padL + frac * plotW
          return (
            <text
              key={`xl-${frac}`}
              x={x}
              y={svgH - 4}
              textAnchor="middle"
              fill={axisTextColor}
              fontSize="7"
              fontFamily="monospace"
            >
              {epVal.toFixed(1)}
            </text>
          )
        })}

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const sigmaVal = SIGMA_MAX - frac * (SIGMA_MAX - SIGMA_MIN)
          const y = padT + frac * plotH
          return (
            <text
              key={`yl-${frac}`}
              x={padL - 4}
              y={y + 3}
              textAnchor="end"
              fill={axisTextColor}
              fontSize="7"
              fontFamily="monospace"
            >
              {sigmaVal.toFixed(0)}
            </text>
          )
        })}

        {/* Axis titles */}
        <text
          x={padL + plotW / 2}
          y={svgH - 0}
          textAnchor="middle"
          fill={axisTextColor}
          fontSize="8"
          fontFamily="serif"
          fontWeight="bold"
        >
          {t('heatmap.xAxis', lang)}
        </text>
        <text
          x={6}
          y={padT + plotH / 2}
          textAnchor="middle"
          fill={axisTextColor}
          fontSize="8"
          fontFamily="serif"
          fontWeight="bold"
          transform={`rotate(-90, 6, ${padT + plotH / 2})`}
        >
          {t('heatmap.yAxis', lang)} (°)
        </text>

        {/* Current position crosshair */}
        {curCol >= 0 && curCol < GRID_SIZE && curRow >= 0 && curRow < GRID_SIZE && (
          <>
            <line
              x1={curX}
              y1={padT}
              x2={curX}
              y2={padT + plotH}
              stroke="white"
              strokeWidth="0.8"
              strokeDasharray="2 2"
              opacity="0.5"
            />
            <line
              x1={padL}
              y1={curY}
              x2={padL + plotW}
              y2={curY}
              stroke="white"
              strokeWidth="0.8"
              strokeDasharray="2 2"
              opacity="0.5"
            />
            <circle
              cx={curX}
              cy={curY}
              r="4"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              opacity="0.9"
            />
            <circle
              cx={curX}
              cy={curY}
              r="2"
              fill="white"
              opacity="0.9"
            />
          </>
        )}
      </svg>

      {/* Color legend */}
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-[8px]" style={{ color: textColor }}>{t('heatmap.legend', lang)}</span>
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{
          background: `linear-gradient(90deg, ${valueToColor(minVal, minVal, maxVal, isPaperTheme)}, ${valueToColor(maxVal, minVal, maxVal, isPaperTheme)})`,
        }} />
        <span className="text-[8px] font-mono" style={{ color: textColor }}>
          {minVal.toFixed(1)}{t('heatmap.unit', lang)} — {maxVal.toFixed(1)}{t('heatmap.unit', lang)}
        </span>
      </div>
    </div>
  )
}
