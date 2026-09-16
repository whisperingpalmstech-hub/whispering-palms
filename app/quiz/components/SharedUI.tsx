'use client'
import React from 'react'
import { Icons } from './Icons'

// ============================================================
// SHARED TYPES
// ============================================================
export interface QuizData {
    gender: string
    ageRange: string
    astrologyFamiliarity: string
    pastReadings: string
    currentChallenges: string[]
    lifeAreas: string[]
    /**
     * Optional: the quiz no longer asks for a name (removed when it was
     * simplified into a marketing funnel), but LifeAreasStep still greets the
     * user by name when one is present and falls back cleanly when it is not.
     * Kept optional so that personalisation can be restored — e.g. prefilled
     * from a logged-in user — without another type change.
     */
    name?: string
}

export const INITIAL_QUIZ_DATA: QuizData = {
    gender: '',
    ageRange: '',
    astrologyFamiliarity: '',
    pastReadings: '',
    currentChallenges: [],
    lifeAreas: [],
}

export interface StepProps {
    data: QuizData
    onUpdate: (field: keyof QuizData, value: any) => void
    onNext: () => void
    onBack: () => void
    step: number
    totalSteps: number
}

// ============================================================
// REUSABLE UI COMPONENTS
// ============================================================

export function SelectionCard({
    selected, onClick, children, icon, subtext
}: {
    selected: boolean; onClick: () => void; children: React.ReactNode; icon: React.ReactNode; subtext?: string
}) {
    return (
        <button onClick={onClick} className={`
      group relative w-full flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 transition-all duration-300 text-left
      ${selected
                ? 'border-amber-400/80 bg-amber-400/10 shadow-[0_0_25px_rgba(251,191,36,0.12)]'
                : 'border-yellow-100/10 bg-yellow-100/[0.03] hover:border-yellow-100/25 hover:bg-yellow-100/[0.06]'
            }
    `}>
            <div className={`w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 rounded-xl flex items-center justify-center transition-colors ${selected ? 'bg-amber-400/20 text-amber-300' : 'bg-yellow-100/10 text-yellow-50/60'}`}>
                <div className="w-5 h-5 sm:w-6 sm:h-6">{icon}</div>
            </div>
            <div className="flex-1 min-w-0">
                <span className={`block text-sm sm:text-base font-semibold transition-colors ${selected ? 'text-amber-200' : 'text-yellow-50/90'}`}>
                    {children}
                </span>
                {subtext && <span className="block text-xs text-yellow-50/40 mt-0.5">{subtext}</span>}
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${selected ? 'border-amber-400 bg-amber-400' : 'border-yellow-100/20'}`}>
                {selected && <div className="w-3 h-3 text-slate-900">{Icons.check}</div>}
            </div>
        </button>
    )
}

export function MultiSelectCard({
    selected, onClick, children, icon
}: {
    selected: boolean; onClick: () => void; children: React.ReactNode; icon: React.ReactNode
}) {
    return (
        <button onClick={onClick} className={`
      group relative p-4 sm:p-5 rounded-2xl border-2 transition-all duration-300 text-center
      ${selected
                ? 'border-amber-400/80 bg-amber-400/10 shadow-[0_0_25px_rgba(251,191,36,0.12)]'
                : 'border-yellow-100/10 bg-yellow-100/[0.03] hover:border-yellow-100/25 hover:bg-yellow-100/[0.06]'
            }
    `}>
            <div className={`w-8 h-8 mx-auto mb-2 transition-colors ${selected ? 'text-amber-300' : 'text-yellow-50/60'}`}>{icon}</div>
            <span className={`text-xs sm:text-sm font-semibold transition-colors ${selected ? 'text-amber-200' : 'text-yellow-50/90'}`}>
                {children}
            </span>
            {selected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                    <div className="w-3 h-3 text-slate-900">{Icons.check}</div>
                </div>
            )}
        </button>
    )
}

export function ContinueButton({ onClick, disabled = false, loading = false, children = 'Continue' }: {
    onClick: () => void; disabled?: boolean; loading?: boolean; children?: React.ReactNode
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className="
        w-full mt-6 sm:mt-8 py-3.5 sm:py-4 px-6 rounded-2xl font-bold text-base sm:text-lg
        bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400
        text-slate-900 
        shadow-[0_0_30px_rgba(251,191,36,0.3)]
        hover:shadow-[0_0_40px_rgba(251,191,36,0.5)]
        hover:scale-[1.02] active:scale-[0.98]
        transition-all duration-300
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none
        flex items-center justify-center gap-2
      "
        >
            {loading ? <div className="w-5 h-5">{Icons.spinner}</div> : null}
            {children}
        </button>
    )
}

export function StepHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
    return (
        <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500/10 to-purple-500/20 border border-yellow-100/10 mb-4 shadow-[0_0_20px_rgba(251,191,36,0.1)]">
                <div className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300">{icon}</div>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-yellow-50 mb-2 leading-tight">
                {title}
            </h2>
            {subtitle && (
                <p className="text-yellow-50/60 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                    {subtitle}
                </p>
            )}
        </div>
    )
}
