'use client'

import { notFound, useRouter } from 'next/navigation'
import { useEffect, useState, useRef, use } from 'react'

interface PlaybackPageProps {
    params: Promise<{
        id: string
    }>
}

/**
 * Ultimate Astrology Avatar Experience
 * - Full-screen focus on the Woman Avatar
 * - Muted infinitely looping video
 * - Background audio loop (Female voice)
 * - Live transcribing (Auto-scrolling) text below the video
 * - No headers, titles, or questions to distract from the experience
 */
export default function PlaybackPage({ params }: PlaybackPageProps) {
    const { id } = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [answer, setAnswer] = useState<any>(null)
    const [showOverlay, setShowOverlay] = useState(false)
    const [audioStarted, setAudioStarted] = useState(false)
    const [displayedText, setDisplayedText] = useState('')
    const audioRef = useRef<HTMLAudioElement>(null)
    const textContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        async function fetchData() {
            // Ownership and auth are checked server-side by /api/playback/[id].
            // A 401 means the email link was opened without a session — send
            // the user through login and back here afterwards.
            const response = await fetch(`/api/playback/${id}`)
            if (response.status === 401) {
                router.push(`/login?redirect=/playback/${id}`)
                return
            }
            if (!response.ok) {
                setLoading(false)
                return
            }
            const result = await response.json()
            const fetched = result.data?.answer ?? null
            setAnswer(fetched)
            // Readings without narration have no audio element to start the
            // transcript — show the text immediately instead of hanging.
            if (fetched && !fetched.audioUrl) {
                setAudioStarted(true)
            }
            setLoading(false)
        }
        fetchData()
    }, [id, router])

    // Live Transcription Logic (Typewriter effect sync)
    useEffect(() => {
        if (!loading && answer?.text && audioStarted) {
            const fullText = answer.text
            let currentIndex = 0

            // Speed up transcription - lowered from 50ms to 25ms
            const interval = setInterval(() => {
                if (currentIndex <= fullText.length) {
                    setDisplayedText(fullText.slice(0, currentIndex))
                    currentIndex++

                    // Auto-scroll transcript
                    if (textContainerRef.current) {
                        textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight
                    }
                } else {
                    clearInterval(interval)
                }
            }, 25) // Adjust speed to match speech

            return () => clearInterval(interval)
        }
    }, [loading, answer, audioStarted])

    // Auto-play logic - REMOVED the 1000ms delay for instant playback
    useEffect(() => {
        if (!loading && answer && audioRef.current) {
            const audio = audioRef.current
            const tryPlay = async () => {
                try {
                    await audio.play()
                    setAudioStarted(true)
                    setShowOverlay(false)
                } catch (err) {
                    setShowOverlay(true)
                }
            }
            tryPlay() // Execute immediately
        }
    }, [loading, answer])

    const handleStart = () => {
        if (audioRef.current) {
            audioRef.current.play()
            setAudioStarted(true)
            setShowOverlay(false)
        }
    }

    if (loading) return null
    if (!answer) return notFound()

    const audioUrl = answer.audioUrl
    const fullAudioUrl = !audioUrl
        ? null
        : audioUrl.startsWith('http')
            ? audioUrl
            : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${audioUrl}`

    const videoUrl = process.env.NEXT_PUBLIC_ASTROLOGER_VIDEO_URL || "/videos/avatar.mp4"

    return (
        <main className="fixed inset-0 bg-[#0a0a0f] text-white overflow-hidden flex flex-col items-center">
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#d4af37]/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 w-full max-w-2xl flex flex-col h-full overflow-hidden">
                {/* 1. Video Container - STAYS ON TOP, NO OVERLAP */}
                <div className="flex-shrink-0 w-full p-4 z-20 bg-[#0a0a0f]">
                    <div className="relative w-full aspect-[16/9] bg-black rounded-2xl overflow-hidden border border-[#d4af37]/30 shadow-2xl">
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        >
                            <source src={videoUrl} type="video/mp4" />
                        </video>

                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                        {audioStarted && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end space-x-1 h-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                                {[0, 0.2, 0.4, 0.1].map((delay, i) => (
                                    <div
                                        key={i}
                                        className="w-[2px] bg-[#d4af37] rounded-full animate-[voice-bar_1s_ease-in-out_infinite]"
                                        style={{ animationDelay: `${delay}s` }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Transcription Box - SMALLER TEXT, FASTER FLOW, FIXED POSITION */}
                <div className="flex-1 w-full px-6 overflow-hidden relative">
                    <div
                        ref={textContainerRef}
                        className="h-full overflow-y-auto pt-2 pb-24 scroll-smooth scrollbar-hide"
                        style={{ scrollBehavior: 'smooth' }}
                    >
                        {/* Font size reduced to text-lg/text-xl for better mobile view */}
                        <div className="text-lg md:text-xl font-serif leading-relaxed text-gray-200 text-center">
                            {displayedText}
                            <span className="inline-block w-1 h-5 bg-[#d4af37] ml-1 animate-pulse align-middle" />
                        </div>
                    </div>

                    {/* Fixed Fades to ensure text never touches video shadow */}
                    <div className="absolute top-0 left-0 right-0 h-4 bg-[#0a0a0f] z-10" />
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0a0a0f] to-transparent pointer-events-none z-10" />
                </div>
            </div>
            {/* Background Loop Audio (Invisible) */}
            <audio ref={audioRef} src={fullAudioUrl} loop style={{ display: 'none' }} />

            {/* Start Overlay */}
            {showOverlay && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center">
                    <button
                        onClick={handleStart}
                        className="group flex flex-col items-center space-y-6"
                    >
                        <div className="w-24 h-24 rounded-full border-2 border-[#d4af37] flex items-center justify-center transition-all group-hover:bg-[#d4af37] group-hover:scale-110">
                            <svg className="w-10 h-10 text-[#d4af37] group-hover:text-black transition-colors" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                        <span className="text-[#d4af37] tracking-[0.4em] uppercase text-sm font-bold">Launch Reveal</span>
                    </button>
                </div>
            )}

            <style jsx global>{`
        @keyframes voice-bar {
          0%, 100% { height: 8px; }
          50% { height: 24px; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
        </main>
    )
}
