'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { QUIZ_STEPS, INITIAL_QUIZ_DATA, type QuizData } from './components/QuizSteps'
import { Icons } from './components/Icons'
import './quiz.css'

// ============================================================
// STARFIELD BACKGROUND
// ============================================================
function StarfieldBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationId: number
        const stars: { x: number; y: number; size: number; opacity: number; twinkleSpeed: number; twinklePhase: number }[] = []

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }

        const createStars = () => {
            stars.length = 0
            const count = Math.min(Math.floor((canvas.width * canvas.height) / 3000), 200)
            for (let i = 0; i < count; i++) {
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 2 + 0.5,
                    opacity: Math.random() * 0.6 + 0.2,
                    twinkleSpeed: Math.random() * 0.02 + 0.01,
                    twinklePhase: Math.random() * Math.PI * 2,
                })
            }
        }

        const draw = (time: number) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            for (const star of stars) {
                const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase) * 0.3 + 0.7
                ctx.beginPath()
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle})`
                ctx.fill()
                if (star.size > 1.2) {
                    ctx.beginPath()
                    ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2)
                    ctx.fillStyle = `rgba(200, 180, 255, ${star.opacity * twinkle * 0.1})`
                    ctx.fill()
                }
            }
            animationId = requestAnimationFrame(draw)
        }

        resize()
        createStars()
        animationId = requestAnimationFrame(draw)

        const handleResize = () => { resize(); createStars() }
        window.addEventListener('resize', handleResize)
        return () => {
            cancelAnimationFrame(animationId)
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" />
}

// ============================================================
// PROGRESS BAR
// ============================================================
function CosmicProgressBar({ current, total }: { current: number; total: number }) {
    const progress = ((current) / (total - 1)) * 100

    return (
        <div className="w-full mb-1">
            <div className="flex items-center justify-between mb-2">
                <span className="text-white/30 text-xs font-medium">{current + 1} of {total}</span>
                <span className="text-white/30 text-xs font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 transition-all duration-700 ease-out relative" style={{ width: `${progress}%` }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite] bg-[length:200%_100%]" />
                </div>
            </div>
        </div>
    )
}

// ============================================================
// MAIN QUIZ PAGE
// ============================================================
export default function QuizPage() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(0)
    const [data, setData] = useState<QuizData>(INITIAL_QUIZ_DATA)
    const [isAnimating, setIsAnimating] = useState(false)
    const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward')
    const containerRef = useRef<HTMLDivElement>(null)

    // Load saved progress
    useEffect(() => {
        try {
            const saved = localStorage.getItem('whispering-palms-quiz')
            if (saved) {
                const parsed = JSON.parse(saved)
                const restoredData = { ...INITIAL_QUIZ_DATA, ...parsed.data }
                setData(restoredData)

                // Safely clamp the step so it doesn't crash if we removed steps
                const savedStep = parsed.step || 0
                setCurrentStep(Math.min(savedStep, QUIZ_STEPS.length - 1))
            }
        } catch { /* ignore */ }
    }, [])

    // Save progress
    useEffect(() => {
        try {
            const toSave = { ...data }
            localStorage.setItem('whispering-palms-quiz', JSON.stringify({ data: toSave, step: currentStep }))
        } catch { /* ignore */ }
    }, [data, currentStep])

    const updateData = useCallback((field: keyof QuizData, value: any) => {
        setData(prev => ({ ...prev, [field]: value }))
    }, [])

    const goToNext = useCallback(() => {
        if (isAnimating) return
        if (currentStep >= QUIZ_STEPS.length - 1) return

        setIsAnimating(true)
        setSlideDirection('forward')
        setTimeout(() => {
            setCurrentStep(prev => Math.min(prev + 1, QUIZ_STEPS.length - 1))
            setIsAnimating(false)
            containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
        }, 300)
    }, [currentStep, isAnimating])

    const goToBack = useCallback(() => {
        if (isAnimating || currentStep === 0) return
        setIsAnimating(true)
        setSlideDirection('backward')
        setTimeout(() => {
            setCurrentStep(prev => Math.max(prev - 1, 0))
            setIsAnimating(false)
        }, 300)
    }, [currentStep, isAnimating])

    const currentStepConfig = QUIZ_STEPS[currentStep]
    const StepComponent = currentStepConfig.component
    const totalProgressSteps = QUIZ_STEPS.filter(s => s.showProgress).length
    const currentProgressIndex = QUIZ_STEPS.slice(0, currentStep + 1).filter(s => s.showProgress).length

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Spiritual background image */}
            <div className="fixed inset-0 z-0">
                <img src="/cosmic-bg.png" alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-indigo-950/70 to-purple-950/60" />
            </div>

            {/* Starfield on top */}
            <StarfieldBackground />

            {/* Floating nebula blobs */}
            <div className="fixed inset-0 pointer-events-none z-[2]">
                <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/8 blur-[120px] animate-blob" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-600/8 blur-[100px] animate-blob animation-delay-2000" />
                <div className="absolute top-[30%] left-[50%] w-[300px] h-[300px] rounded-full bg-amber-600/5 blur-[80px] animate-blob animation-delay-4000" />
            </div>

            {/* Main content */}
            <div ref={containerRef} className="relative z-10 min-h-screen flex flex-col items-center justify-start px-4 py-6 sm:py-8 overflow-y-auto">
                {/* Top bar */}
                <div className="w-full max-w-lg mb-6">
                    <div className="flex items-center justify-between mb-4">
                        {currentStep > 0 ? (
                            <button onClick={goToBack} className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm">
                                <div className="w-4 h-4">{Icons.chevronLeft}</div>
                                Back
                            </button>
                        ) : <div />}

                        <div className="text-white/50 text-xs font-semibold tracking-widest uppercase">
                            Whispering Palms
                        </div>

                        {currentStep > 0 && currentStep < QUIZ_STEPS.length - 1 ? (
                            <button onClick={goToNext} className="text-white/30 hover:text-white/50 transition-colors text-xs">Skip</button>
                        ) : <div />}
                    </div>

                    {currentStepConfig.showProgress && (
                        <CosmicProgressBar current={currentProgressIndex - 1} total={totalProgressSteps} />
                    )}
                </div>

                {/* Step content */}
                <div className="w-full max-w-lg flex-1 flex items-start justify-center">
                    <div className={`w-full transition-all duration-300 ease-out ${isAnimating ? (slideDirection === 'forward' ? 'opacity-0 translate-x-8' : 'opacity-0 -translate-x-8') : 'opacity-100 translate-x-0'}`}>
                        <StepComponent data={data} onUpdate={updateData} onNext={goToNext} onBack={goToBack} step={currentStep} totalSteps={QUIZ_STEPS.length} />
                    </div>
                </div>

                {/* Bottom trust badge */}
                <div className="w-full max-w-lg mt-8 text-center">
                    <div className="flex items-center justify-center gap-4 text-white/20 text-xs">
                        <span className="flex items-center gap-1"><div className="w-3 h-3">{Icons.lock}</div> Secure</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><div className="w-3 h-3">{Icons.star}</div> 12,847+ users</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><div className="w-3 h-3">{Icons.award}</div> 4.8/5 rated</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
