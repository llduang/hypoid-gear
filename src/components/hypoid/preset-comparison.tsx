'use client'

import { useMemo } from 'react'
import { computeHypoidAngles } from '@/lib/hypoid-geometry'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'

interface PresetComparisonProps {
  presets: { name: string; sigma: number; ep: number; pRatio: number }[]
  currentSigma: number
  currentEp: number
  currentPRatio: number
  lang: Lang
}

export function PresetComparison({ presets, currentSigma, currentEp, currentPRatio, lang }: PresetComparisonProps) {
  const rows = useMemo(() => {
    return presets.map(p => {
      const angles = computeHypoidAngles(p.sigma, p.ep, p.pRatio)
      const isActive = currentSigma === p.sigma && Math.abs(currentEp - p.ep) < 0.01 && Math.abs(currentPRatio - p.pRatio) < 0.01
      return {
        name: p.name,
        sigma: p.sigma,
        ep: p.ep,
        pRatio: p.pRatio,
        gamma: (angles.gamma * 180 / Math.PI).toFixed(1),
        Gamma: (angles.Gamma * 180 / Math.PI).toFixed(1),
        ratio: (Math.sin(angles.Gamma) / Math.max(Math.sin(angles.gamma), 0.001)).toFixed(2),
        isActive,
      }
    })
  }, [presets, currentSigma, currentEp, currentPRatio])

  const headerColors = ['#f59e0b', '#10b981', '#3b82f6', '#f472b6', '#c084fc']

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-[9px] border-collapse">
        <thead>
          <tr>
            <th className="text-left text-white/30 p-1 border-b border-white/[0.06]"></th>
            {rows.map((r, i) => (
              <th
                key={i}
                className="text-center p-1 border-b border-white/[0.06] font-medium"
                style={{
                  color: r.isActive ? headerColors[i % headerColors.length] : 'rgba(255,255,255,0.3)',
                  borderBottomColor: r.isActive ? `${headerColors[i % headerColors.length]}44` : undefined,
                }}
              >
                {r.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            { key: 'sigma', label: t('comparison.row.sigma', lang), get: (r: typeof rows[0]) => r.sigma },
            { key: 'ep', label: t('comparison.row.ep', lang), get: (r: typeof rows[0]) => r.ep },
            { key: 'P', label: t('comparison.row.P', lang), get: (r: typeof rows[0]) => r.pRatio },
            { key: 'gamma', label: t('comparison.row.gamma', lang), get: (r: typeof rows[0]) => r.gamma },
            { key: 'Gamma', label: t('comparison.row.Gamma', lang), get: (r: typeof rows[0]) => r.Gamma },
            { key: 'ratio', label: t('comparison.row.ratio', lang), get: (r: typeof rows[0]) => r.ratio },
          ].map(row => (
            <tr key={row.key}>
              <td className="text-white/25 p-1 border-b border-white/[0.03] font-medium">{row.label}</td>
              {rows.map((r, i) => (
                <td
                  key={i}
                  className="text-center p-1 border-b border-white/[0.03] font-mono"
                  style={{
                    color: r.isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)',
                    backgroundColor: r.isActive ? `${headerColors[i % headerColors.length]}10` : undefined,
                  }}
                >
                  {row.get(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
