'use client'

import { useState } from 'react'
import { THEMES, useTheme } from '@/context/ThemeContext'

export default function ThemeSelector() {
  const { currentTheme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const active = THEMES.find((t) => t.id === currentTheme) || THEMES[0]

  return (
    <div className="relative">
      {/* Trigger Button: Sleek Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur-md transition-all hover:bg-white/10 active:scale-95"
        title="Změnit vizuální styl aplikace"
      >
        <span
          className="h-2.5 w-2.5 rounded-full shadow-sm"
          style={{ backgroundColor: active.color, boxShadow: `0 0 10px ${active.color}` }}
        />
        <span className="hidden xs:inline">{active.name}</span>
        <span className="text-slate-400 text-[10px]">▼</span>
      </button>

      {/* Dropdown Modal / Popover */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:bg-transparent"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl border border-white/15 bg-[#120924] p-3 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2 py-1.5 mb-2 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Vyberte styl (5 témat)
              </span>
              <span className="text-[10px] text-pink-400 font-mono">Mobile First</span>
            </div>

            <div className="space-y-1.5">
              {THEMES.map((theme) => {
                const isSelected = theme.id === currentTheme
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setTheme(theme.id)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left rounded-xl p-2.5 flex items-start gap-3 transition-all ${
                      isSelected
                        ? 'bg-white/10 border border-white/20 shadow-md'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div
                      className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 text-base"
                      style={{
                        backgroundColor: `${theme.color}20`,
                        boxShadow: isSelected ? `0 0 15px ${theme.color}40` : 'none',
                      }}
                    >
                      {theme.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">{theme.name}</span>
                        {isSelected && (
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: theme.color, boxShadow: `0 0 8px ${theme.color}` }}
                          />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        {theme.desc}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
