'use client'

import { useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface AnimationTimelineProps {
  steps: boolean[]
  activeStep: number // -1 = all visible
  autoPlaying: boolean
  onStepClick: (stepIndex: number) => void
}

const stepColors = [
  '#c084fc', // K1K2 - purple
  '#ef4444', // P - red
  '#f59e0b', // axes - amber
  '#10b981', // Ep - emerald
  '#3b82f6', // Plane T - blue
  '#fbbf24', // H1, H2 - yellow
  '#8b5cf6', // cones - violet
]

const stepNames = ['K₁K₂', 'P', 'Axes', 'Eₚ', 'T', 'H₁H₂', 'Cones']

export function AnimationTimeline({
  steps,
  activeStep,
  autoPlaying,
  onStepClick,
}: AnimationTimelineProps) {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null)
  const stepLabels = ['1', '2', '3', '4', '5', '6', '7']

  // Find the last active step index for completed coloring
  const lastActiveIndex = steps.reduce((last, active, i) => active ? i : last, -1)

  return (
    <div className="px-4 py-2 bg-[#0d0d14]/80 border-t border-white/[0.06]">
      <div className="flex items-center gap-1">
        {steps.map((visible, i) => (
          <div key={i} className="flex-1 flex items-center gap-0.5">
            {/* Step segment */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onStepClick(i)}
                    onMouseEnter={() => setHoveredStep(i)}
                    onMouseLeave={() => setHoveredStep(null)}
                    className={`
                      relative flex-1 h-8 rounded-md transition-all duration-300 overflow-hidden
                      border cursor-pointer
                      ${visible
                        ? i <= lastActiveIndex
                          ? 'border-white/10'
                          : 'border-white/[0.06]'
                        : 'border-white/[0.04] opacity-40'
                      }
                      ${activeStep === i
                        ? 'ring-1 ring-white/20 ring-offset-1 ring-offset-[#0d0d14] hypoid-timeline-active-glow'
                        : ''
                      }
                      hover:scale-[1.02] active:scale-[0.98]
                    `}
                    style={{
                      background: visible
                        ? i <= lastActiveIndex
                          ? `linear-gradient(135deg, ${stepColors[i]}25, ${stepColors[i]}08)`
                          : `linear-gradient(135deg, ${stepColors[i]}15, ${stepColors[i]}04)`
                        : 'rgba(255,255,255,0.01)',
                      borderColor: activeStep === i ? `${stepColors[i]}40` : undefined,
                    }}
                  >
                    {/* Progress fill during auto-play */}
                    {autoPlaying && activeStep === i && (
                      <div
                        className="absolute inset-y-0 left-0 rounded-md animate-pulse"
                        style={{
                          background: `${stepColors[i]}30`,
                          animation: 'pulse 1.2s ease-in-out infinite',
                        }}
                      />
                    )}
                    {/* Step number + progress dot */}
                    <div className="relative z-10 flex items-center justify-center h-full gap-1">
                      <span
                        className="text-[10px] font-mono font-bold"
                        style={{ color: visible ? stepColors[i] : 'rgba(255,255,255,0.15)' }}
                      >
                        {stepLabels[i]}
                      </span>
                    </div>
                    {/* Active indicator dot */}
                    {activeStep === i && (
                      <div
                        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: stepColors[i] }}
                      />
                    )}
                    {/* Completed step indicator */}
                    {visible && activeStep !== i && i < lastActiveIndex && (
                      <div
                        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                        style={{ backgroundColor: `${stepColors[i]}80` }}
                      />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px] px-2 py-1">
                  <span style={{ color: stepColors[i] }}>Step {i + 1}: </span>
                  <span className="text-white/70">{stepNames[i]}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {/* Connector between steps - animated dashed line */}
            {i < steps.length - 1 && (
              <div className="w-2 h-[2px] relative overflow-hidden">
                <svg width="100%" height="2" className="absolute inset-0">
                  <line
                    x1="0" y1="1" x2="100%" y2="1"
                    stroke={visible && steps[i + 1] ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}
                    strokeWidth="1"
                    strokeDasharray="3 2"
                    className={visible && steps[i + 1] ? 'hypoid-timeline-dash' : ''}
                  />
                </svg>
                {/* Progress dot on connector */}
                {visible && steps[i + 1] && (
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full"
                    style={{ backgroundColor: `${stepColors[i]}60` }}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Step names below */}
      <div className="flex mt-1">
        {stepNames.map((name, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[8px] font-mono transition-colors duration-200"
            style={{
              color: steps[i]
                ? i <= lastActiveIndex
                  ? `${stepColors[i]}90`
                  : `${stepColors[i]}60`
                : 'rgba(255,255,255,0.08)',
              fontWeight: activeStep === i ? 600 : 400,
            }}
          >
            {name}
          </div>
        ))}
      </div>
    </div>
  )
}
