'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface SavedParamSet {
  name: string
  sigma: number
  ep: number
  pRatio: number
  timestamp: number
}

const STORAGE_KEY = 'hypoid-saved-params'
const MAX_SAVED = 10

function loadSavedParams(): SavedParamSet[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveParamsToStorage(params: SavedParamSet[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params.slice(0, MAX_SAVED)))
  } catch {
    // localStorage full or unavailable
  }
}

interface SaveLoadParamsProps {
  sigma: number
  ep: number
  pRatio: number
  onLoad: (sigma: number, ep: number, pRatio: number) => void
}

export function SaveLoadParams({ sigma, ep, pRatio, onLoad }: SaveLoadParamsProps) {
  const [savedSets, setSavedSets] = useState<SavedParamSet[]>(() => loadSavedParams())
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [showSaved, setShowSaved] = useState(false)

  const handleSave = useCallback(() => {
    if (!saveName.trim()) return
    const newSet: SavedParamSet = {
      name: saveName.trim(),
      sigma,
      ep: Math.round(ep * 10) / 10,
      pRatio: Math.round(pRatio * 100) / 100,
      timestamp: Date.now(),
    }
    const updated = [newSet, ...savedSets].slice(0, MAX_SAVED)
    setSavedSets(updated)
    saveParamsToStorage(updated)
    setSaveName('')
    setShowSaveInput(false)
  }, [saveName, sigma, ep, pRatio, savedSets])

  const handleDelete = useCallback((timestamp: number) => {
    const updated = savedSets.filter(s => s.timestamp !== timestamp)
    setSavedSets(updated)
    saveParamsToStorage(updated)
  }, [savedSets])

  const handleLoad = useCallback((set: SavedParamSet) => {
    onLoad(set.sigma, set.ep, set.pRatio)
  }, [onLoad])

  return (
    <div>
      {/* Save button */}
      <div className="flex gap-1.5 mt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setShowSaveInput(!showSaveInput); setSaveName('') }}
          className="flex-1 text-[10px] h-6 border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all"
        >
          💾 保存当前参数
        </Button>
      </div>

      {/* Inline save input */}
      {showSaveInput && (
        <div className="mt-1.5 flex gap-1.5">
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveInput(false) }}
            placeholder="输入参数集名称..."
            className="flex-1 h-6 text-[10px] bg-white/[0.05] border-white/10 text-white placeholder:text-white/20"
            autoFocus
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!saveName.trim()}
            className="text-[10px] h-6 px-2 border-white/10 text-white/50 hover:text-white"
          >
            ✓
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSaveInput(false)}
            className="text-[10px] h-6 px-2 text-white/30 hover:text-white/50"
          >
            ✕
          </Button>
        </div>
      )}

      {/* Saved sets list toggle */}
      <button
        onClick={() => setShowSaved(!showSaved)}
        className="mt-2 text-[10px] text-white/30 hover:text-white/60 transition-colors w-full text-left"
      >
        {showSaved ? '▾' : '▸'} 已保存参数 {savedSets.length > 0 && `(${savedSets.length})`}
      </button>

      {showSaved && (
        <div className="mt-1 space-y-1 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          {savedSets.length === 0 ? (
            <div className="text-[9px] text-white/20 py-2 text-center">暂无保存的参数集</div>
          ) : (
            savedSets.map((set) => (
              <div
                key={set.timestamp}
                className="flex items-center gap-1.5 p-1.5 rounded bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-white/60 font-medium truncate">{set.name}</div>
                  <div className="text-[9px] text-white/25 font-mono">
                    Σ={set.sigma}° Eₚ={set.ep} P={set.pRatio}
                  </div>
                </div>
                <button
                  onClick={() => handleLoad(set)}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/40 hover:text-white/80 hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
                >
                  加载
                </button>
                <button
                  onClick={() => handleDelete(set.timestamp)}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                >
                  删除
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
