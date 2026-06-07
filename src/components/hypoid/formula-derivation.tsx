'use client'

import { useMemo } from 'react'
import type { HypoidGeometry } from '@/lib/hypoid-geometry'

interface FormulaDerivationProps {
  geo: HypoidGeometry
}

export function FormulaDerivationPanel({ geo }: FormulaDerivationProps) {
  const steps = useMemo(() => {
    const SigmaRad = geo.Sigma
    const SigmaDeg = (SigmaRad * 180 / Math.PI).toFixed(1)
    const gammaDeg = (geo.gamma * 180 / Math.PI).toFixed(2)
    const GammaDeg = (geo.Gamma * 180 / Math.PI).toFixed(2)

    // Step 1: tan(η)
    const cosEta = (Math.sin(geo.Gamma) + Math.sin(geo.gamma) * Math.cos(SigmaRad)) /
      (Math.cos(geo.gamma) * Math.sin(SigmaRad) + 1e-10)
    const etaDeg = (geo.eta * 180 / Math.PI).toFixed(2)
    const cosEtaVal = cosEta.toFixed(4)

    // Step 2: sin(ε)
    const cosEpsilon = (Math.sin(geo.gamma) + Math.sin(geo.Gamma) * Math.cos(SigmaRad)) /
      (Math.cos(geo.Gamma) * Math.sin(SigmaRad) + 1e-10)
    const epsilonDeg = (geo.epsilon * 180 / Math.PI).toFixed(2)
    const cosEpsilonVal = cosEpsilon.toFixed(4)

    // Step 3: tan(Γ) and Γ
    const tanGamma_large = Math.tan(geo.Gamma).toFixed(4)

    // Step 4: tan(γ) and γ
    const tanGamma_small = Math.tan(geo.gamma).toFixed(4)

    // Step 5: ε'
    const sinEpsilonPrime = Math.sin(SigmaRad) * Math.sin(geo.epsilon) / (Math.cos(geo.gamma) + 1e-10)
    const epsilonPrimeDeg = (geo.epsilonPrime * 180 / Math.PI).toFixed(2)
    const sinEpsilonPrimeVal = sinEpsilonPrime.toFixed(4)

    // Step 6: Zp, Z, Zg, G
    const tanEpsilon = Math.tan(geo.epsilon).toFixed(4)
    const tanSigma = Math.tan(SigmaRad).toFixed(4)
    const sinSigma = Math.sin(SigmaRad).toFixed(4)
    const sinGamma = Math.sin(geo.gamma).toFixed(4)
    const sinGamma_large = Math.sin(geo.Gamma).toFixed(4)
    const cosGamma = Math.cos(geo.gamma).toFixed(4)
    const cosGamma_large = Math.cos(geo.Gamma).toFixed(4)

    return [
      {
        label: '小轮偏置角 η',
        color: '#fbbf24',
        formulas: [
          `cos(η) = (sin(Γ) + sin(γ)·cos(Σ)) / (cos(γ)·sin(Σ))`,
          `cos(η) = (${sinGamma_large} + ${sinGamma}×${Math.cos(SigmaRad).toFixed(4)}) / (${cosGamma}×${sinSigma})`,
          `cos(η) = ${cosEtaVal}`,
          `η = ${etaDeg}°`,
        ],
      },
      {
        label: '大轮偏置角 ε',
        color: '#34d399',
        formulas: [
          `cos(ε) = (sin(γ) + sin(Γ)·cos(Σ)) / (cos(Γ)·sin(Σ))`,
          `cos(ε) = (${sinGamma} + ${sinGamma_large}×${Math.cos(SigmaRad).toFixed(4)}) / (${cosGamma_large}×${sinSigma})`,
          `cos(ε) = ${cosEpsilonVal}`,
          `ε = ${epsilonDeg}°`,
        ],
      },
      {
        label: '大轮节锥角 Γ',
        color: '#34d399',
        formulas: [
          `tan(Γ) = sin(ε)/(tan(η)·sin(Σ)) - cos(ε)·cot(Σ)`,
          `tan(Γ) = ${Math.sin(geo.epsilon).toFixed(4)}/(${Math.tan(geo.eta).toFixed(4)}×${sinSigma}) - ${Math.cos(geo.epsilon).toFixed(4)}×${cot(SigmaRad).toFixed(4)}`,
          `tan(Γ) = ${tanGamma_large}`,
          `Γ = ${GammaDeg}°`,
        ],
      },
      {
        label: '小轮节锥角 γ',
        color: '#fbbf24',
        formulas: [
          `tan(γ) = sin(η)/(tan(ε)·sin(Σ)) - cos(η)·cot(Σ)`,
          `tan(γ) = ${Math.sin(geo.eta).toFixed(4)}/(${tanEpsilon}×${sinSigma}) - ${Math.cos(geo.eta).toFixed(4)}×${cot(SigmaRad).toFixed(4)}`,
          `tan(γ) = ${tanGamma_small}`,
          `γ = ${gammaDeg}°`,
        ],
      },
      {
        label: '偏置角 ε\'',
        color: '#f472b6',
        formulas: [
          `sin(ε') = sin(Σ)·sin(ε) / cos(γ)`,
          `sin(ε') = ${sinSigma}×${Math.sin(geo.epsilon).toFixed(4)} / ${cosGamma}`,
          `sin(ε') = ${sinEpsilonPrimeVal}`,
          `ε' = ${epsilonPrimeDeg}°`,
        ],
      },
      {
        label: '位置参数',
        color: '#a78bfa',
        formulas: [
          `Zp = Eₚ/(tan(ε)·tan(Σ)) + Aₚ·tan(γ)·sin(Γ) = ${geo.Zp.toFixed(2)}`,
          `Z  = R/tan(Γ) - Zp = ${geo.Z.toFixed(2)}`,
          `Zg = Eₚ/(tan(ε)·sin(Σ)) - Rₚ·tan(γ) = ${geo.Zg.toFixed(2)}`,
          `G  = Rₚ/tan(γ) - Zg = ${geo.G.toFixed(2)}`,
        ],
      },
    ]
  }, [geo])

  return (
    <div className="mt-1.5 space-y-2">
      {steps.map((step, i) => (
        <div
          key={i}
          className="p-2 rounded-md bg-white/[0.015] border border-white/[0.04]"
          style={{ borderLeftColor: step.color, borderLeftWidth: '2px' }}
        >
          <div className="text-[9px] font-semibold mb-1" style={{ color: step.color }}>
            {step.label}
          </div>
          <div className="space-y-0.5">
            {step.formulas.map((formula, j) => (
              <div
                key={j}
                className={`text-[9px] font-mono ${
                  j === step.formulas.length - 1
                    ? 'text-white/60 font-bold'
                    : 'text-white/25'
                }`}
              >
                {formula}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="text-[8px] text-white/15 font-mono">
        已知: Σ = {(geo.Sigma * 180 / Math.PI).toFixed(1)}°, Eₚ = {geo.Ep.toFixed(1)}, P = {(geo.Rp / Math.max(geo.R, 0.01) * 0.4).toFixed(2)}
      </div>
    </div>
  )
}

function cot(x: number): number {
  return Math.cos(x) / (Math.sin(x) + 1e-10)
}
