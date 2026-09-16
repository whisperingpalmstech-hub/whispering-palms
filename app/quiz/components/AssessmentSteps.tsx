'use client'
import React, { useState, useEffect } from 'react'
import { Icons } from './Icons'
import { StepProps, SelectionCard, MultiSelectCard, ContinueButton, StepHeader } from './SharedUI'

// ============================================================
// STEP 1: WELCOME SCREEN
// ============================================================
export function WelcomeStep({ onNext }: StepProps) {
    const [show, setShow] = useState(false)
    useEffect(() => { setTimeout(() => setShow(true), 300) }, [])

    return (
        <div className={`text-center transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="relative mx-auto w-24 h-24 sm:w-32 sm:h-32 mb-6 sm:mb-8">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 animate-pulse" />
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-600/40 to-amber-500/30 backdrop-blur-sm border border-white/10" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 text-amber-300">{Icons.crystalBall}</div>
                </div>
                <div className="absolute inset-[-8px] animate-[spin_8s_linear_infinite]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                </div>
                <div className="absolute inset-[-16px] animate-[spin_12s_linear_infinite_reverse]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.6)]" />
                </div>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-3 sm:mb-4 leading-tight">
                Discover What the Stars<br />
                <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                    Have Written for You
                </span>
            </h1>

            <p className="text-white/50 text-sm sm:text-base mb-3 max-w-sm mx-auto leading-relaxed">
                Take this personalized quiz and unlock your cosmic blueprint — including your birth chart, palm insights, and daily guidance.
            </p>

            <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
                <div className="flex -space-x-2">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-600/60 to-indigo-600/60 border-2 border-slate-900 flex items-center justify-center">
                            <div className="w-4 h-4 text-white/70">{Icons.person}</div>
                        </div>
                    ))}
                </div>
                <span className="text-white/40 text-xs sm:text-sm">
                    <span className="text-amber-400 font-semibold">12,847+</span> readings this month
                </span>
            </div>

            <ContinueButton onClick={onNext}>
                <div className="w-5 h-5 mr-1">{Icons.sparkles}</div>
                Start Your Free Reading
            </ContinueButton>

            <p className="text-white/30 text-xs mt-4">
                Free • 3 minutes • No credit card required
            </p>
        </div>
    )
}

// ============================================================
// STEP 2: GENDER SELECTION
// ============================================================
export function GenderStep({ data, onUpdate, onNext }: StepProps) {
    const genders = [
        { value: 'male', label: 'Male', icon: Icons.male },
        { value: 'female', label: 'Female', icon: Icons.female },
        { value: 'other', label: 'Other / Prefer not to say', icon: Icons.nonBinary },
    ]

    const handleSelect = (value: string) => {
        onUpdate('gender', value)
        setTimeout(onNext, 400)
    }

    return (
        <div>
            <StepHeader icon={Icons.person} title="Tell us about yourself" subtitle="This helps us personalize your cosmic reading" />
            <div className="space-y-3">
                {genders.map(g => (
                    <SelectionCard key={g.value} selected={data.gender === g.value} onClick={() => handleSelect(g.value)} icon={g.icon}>
                        {g.label}
                    </SelectionCard>
                ))}
            </div>
        </div>
    )
}

// ============================================================
// STEP 3: AGE RANGE
// ============================================================
export function AgeStep({ data, onUpdate, onNext }: StepProps) {
    const ages = [
        { value: '18-24', label: '18 - 24', icon: Icons.seedling },
        { value: '25-34', label: '25 - 34', icon: Icons.leaf },
        { value: '35-44', label: '35 - 44', icon: Icons.sun },
        { value: '45-54', label: '45 - 54', icon: Icons.moonStar },
        { value: '55+', label: '55+', icon: Icons.star },
    ]

    const handleSelect = (value: string) => {
        onUpdate('ageRange', value)
        setTimeout(onNext, 400)
    }

    return (
        <div>
            <StepHeader icon={Icons.calendar} title="What's your age range?" subtitle="Different life stages reveal different cosmic patterns" />
            <div className="space-y-3">
                {ages.map(a => (
                    <SelectionCard key={a.value} selected={data.ageRange === a.value} onClick={() => handleSelect(a.value)} icon={a.icon}>
                        {a.label}
                    </SelectionCard>
                ))}
            </div>
        </div>
    )
}

// ============================================================
// STEP 4: BRIDGE SCREEN 1
// ============================================================
export function BridgeScreen1({ onNext }: StepProps) {
    const [visible, setVisible] = useState(false)
    useEffect(() => { setTimeout(() => setVisible(true), 200) }, [])

    return (
        <div className={`text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 text-indigo-300">{Icons.constellation}</div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
                The stars hold<br />
                <span className="bg-gradient-to-r from-purple-300 to-indigo-300 bg-clip-text text-transparent">
                    ancient wisdom
                </span>
                <br />about your life path
            </h2>
            <p className="text-white/45 text-sm sm:text-base max-w-sm mx-auto mb-4 leading-relaxed">
                For thousands of years, Vedic astrology and palmistry have helped millions discover their true purpose. Your celestial blueprint was set the moment you were born.
            </p>
            <div className="flex items-center justify-center gap-4 text-white/30 text-xs sm:text-sm mb-6">
                <span className="flex items-center gap-1.5"><div className="w-4 h-4">{Icons.award}</div> Based on Vedic Science</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><div className="w-4 h-4">{Icons.chart}</div> 5,000+ Years of Wisdom</span>
            </div>
            <ContinueButton onClick={onNext}>Continue</ContinueButton>
        </div>
    )
}

// ============================================================
// STEP 5: ASTROLOGY FAMILIARITY
// ============================================================
export function AstrologyFamiliarityStep({ data, onUpdate, onNext }: StepProps) {
    const options = [
        { value: 'very', label: 'Yes, I follow it regularly', icon: Icons.star, sub: 'I read horoscopes and know my chart' },
        { value: 'somewhat', label: 'Somewhat familiar', icon: Icons.moonStar, sub: 'I know my sign but not much else' },
        { value: 'curious', label: 'New to this, but curious', icon: Icons.sparkles, sub: 'I want to learn more' },
        { value: 'skeptic', label: 'Skeptical but open-minded', icon: Icons.eye, sub: 'Show me what it can reveal' },
    ]

    const handleSelect = (value: string) => {
        onUpdate('astrologyFamiliarity', value)
        setTimeout(onNext, 400)
    }

    return (
        <div>
            <StepHeader icon={Icons.telescope} title="How familiar are you with astrology?" subtitle="No wrong answers — we'll adjust your experience" />
            <div className="space-y-3">
                {options.map(o => (
                    <SelectionCard key={o.value} selected={data.astrologyFamiliarity === o.value} onClick={() => handleSelect(o.value)} icon={o.icon} subtext={o.sub}>
                        {o.label}
                    </SelectionCard>
                ))}
            </div>
        </div>
    )
}

// ============================================================
// STEP 6: PAST READINGS
// ============================================================
export function PastReadingsStep({ data, onUpdate, onNext }: StepProps) {
    const options = [
        { value: 'yes_palm', label: 'Yes, a palm reading', icon: Icons.hand },
        { value: 'yes_astro', label: 'Yes, an astrology reading', icon: Icons.constellation },
        { value: 'yes_both', label: 'Yes, both!', icon: Icons.sparkles },
        { value: 'no', label: 'No, this is my first time', icon: Icons.zap },
    ]

    const handleSelect = (value: string) => {
        onUpdate('pastReadings', value)
        setTimeout(onNext, 400)
    }

    return (
        <div>
            <StepHeader icon={Icons.hand} title="Have you ever had a spiritual reading before?" subtitle="This helps us provide the right level of detail" />
            <div className="space-y-3">
                {options.map(o => (
                    <SelectionCard key={o.value} selected={data.pastReadings === o.value} onClick={() => handleSelect(o.value)} icon={o.icon}>
                        {o.label}
                    </SelectionCard>
                ))}
            </div>
        </div>
    )
}

// ============================================================
// STEP 7: CURRENT CHALLENGES (Multi-select)
// ============================================================
export function ChallengesStep({ data, onUpdate, onNext }: StepProps) {
    const challenges = [
        { value: 'career', label: 'Career uncertainty', icon: Icons.briefcase },
        { value: 'love', label: 'Love & relationships', icon: Icons.heart },
        { value: 'finance', label: 'Financial stress', icon: Icons.coins },
        { value: 'health', label: 'Health concerns', icon: Icons.medical },
        { value: 'purpose', label: 'Finding my purpose', icon: Icons.compass },
        { value: 'confidence', label: 'Self-confidence', icon: Icons.shield },
    ]

    const toggleChallenge = (value: string) => {
        const current = data.currentChallenges || []
        if (current.includes(value)) {
            onUpdate('currentChallenges', current.filter((c: string) => c !== value))
        } else {
            onUpdate('currentChallenges', [...current, value])
        }
    }

    return (
        <div>
            <StepHeader icon={Icons.target} title="What challenges are you facing?" subtitle="Select all that apply — we'll focus your reading on these areas" />
            <div className="grid grid-cols-2 gap-3">
                {challenges.map(c => (
                    <MultiSelectCard key={c.value} selected={(data.currentChallenges || []).includes(c.value)} onClick={() => toggleChallenge(c.value)} icon={c.icon}>
                        {c.label}
                    </MultiSelectCard>
                ))}
            </div>
            <ContinueButton onClick={onNext} disabled={(data.currentChallenges || []).length === 0}>
                Continue
            </ContinueButton>
        </div>
    )
}

// ============================================================
// STEP 8: BRIDGE SCREEN 2 (Insight)
// ============================================================
export function BridgeScreen2({ data, onNext }: StepProps) {
    const [visible, setVisible] = useState(false)
    useEffect(() => { setTimeout(() => setVisible(true), 200) }, [])

    const insightMap: Record<string, string> = {
        career: "Your stars suggest that career transitions are coming — your cosmic energy is shifting towards new opportunities.",
        love: "The planetary alignments in your chart hint at deep emotional connections waiting to be discovered.",
        finance: "Your cosmic blueprint shows patterns of abundance — understanding your energy can unlock financial flow.",
        health: "The stars reveal that your cosmic vitality is connected to understanding your deeper purpose.",
        purpose: "Your celestial map indicates you're at a pivotal crossroads — your soul is ready for transformation.",
        confidence: "The cosmic forces are aligning to help you step into your true power and authentic self.",
    }

    const mainChallenge = (data.currentChallenges || [])[0] || 'purpose'
    const insight = insightMap[mainChallenge] || insightMap.purpose

    return (
        <div className={`text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="relative inline-block mb-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-amber-400/20 flex items-center justify-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 text-amber-300">{Icons.lightbulb}</div>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 animate-pulse" />
            </div>

            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-4">
                Early cosmic insight just for you
            </h2>

            <div className="bg-white/5 border border-amber-400/20 rounded-2xl p-5 sm:p-6 mb-6">
                <p className="text-amber-200/90 text-sm sm:text-base italic leading-relaxed">
                    &ldquo;{insight}&rdquo;
                </p>
            </div>

            <p className="text-white/40 text-xs sm:text-sm mb-4">
                This is just a glimpse — your full reading requires your birth details.
            </p>

            <ContinueButton onClick={onNext}>
                Tell Me More
                <div className="w-4 h-4 ml-1">{Icons.arrowRight}</div>
            </ContinueButton>
        </div>
    )
}

// ============================================================
// STEP 9: LIFE AREA FOCUS (Multi-select)
// ============================================================
export function LifeAreasStep({ data, onUpdate, onNext }: StepProps) {
    const areas = [
        { value: 'love', label: 'Love & Marriage', icon: Icons.heart },
        { value: 'career', label: 'Career & Business', icon: Icons.rocket },
        { value: 'health', label: 'Health & Wellness', icon: Icons.leaf },
        { value: 'wealth', label: 'Wealth & Finances', icon: Icons.diamond },
        { value: 'spiritual', label: 'Spiritual Growth', icon: Icons.lotus },
        { value: 'family', label: 'Family & Children', icon: Icons.family },
    ]

    const toggleArea = (value: string) => {
        const current = data.lifeAreas || []
        if (current.includes(value)) {
            onUpdate('lifeAreas', current.filter((a: string) => a !== value))
        } else {
            onUpdate('lifeAreas', [...current, value])
        }
    }

    return (
        <div>
            <StepHeader icon={Icons.star} title={data.name ? `${data.name}, what matters most to you?` : "What areas of life matter most?"} subtitle="Select all that you'd like guidance on" />
            <div className="grid grid-cols-2 gap-3">
                {areas.map(a => (
                    <MultiSelectCard key={a.value} selected={(data.lifeAreas || []).includes(a.value)} onClick={() => toggleArea(a.value)} icon={a.icon}>
                        {a.label}
                    </MultiSelectCard>
                ))}
            </div>
            <ContinueButton onClick={onNext} disabled={(data.lifeAreas || []).length === 0}>
                Continue
            </ContinueButton>
        </div>
    )
}

// ============================================================
// STEP 10: BRIDGE SCREEN 3 (Premium Plans)
// ============================================================
export function BridgeScreen3({ onNext }: StepProps) {
    const [visible, setVisible] = useState(false)
    useEffect(() => { setTimeout(() => setVisible(true), 200) }, [])

    const plans = [
        { name: 'Spark', price: '$10', questions: '5 Questions', speed: '1hr Delivery', color: 'from-amber-400 to-amber-600', icon: Icons.sparkles },
        { name: 'Flame', price: '$25', questions: '8 Questions', speed: '5min Voice', color: 'from-orange-400 to-orange-600', icon: Icons.lightbulb, popular: true },
        { name: 'Superflame', price: '$35', questions: 'Unlimited', speed: 'Instant + All Features', color: 'from-purple-400 to-purple-600', icon: Icons.star },
    ]

    return (
        <div className={`text-center transition-all duration-700 w-full max-w-sm mx-auto ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="relative inline-block mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-400/20 flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.15)]">
                    <div className="w-8 h-8 text-amber-400">{Icons.star}</div>
                </div>
            </div>

            <h2 className="text-2xl font-black text-yellow-50 mb-2 leading-tight">
                Deepen Your <span className="text-amber-400">Connection</span>
            </h2>

            <p className="text-yellow-50/60 text-xs mb-6 px-4">
                Your base profile is <strong className="text-amber-300">100% Free</strong>. To ask unlimited Oracle questions and get voice-narrated palm readings, discover our premium cosmic plans.
            </p>

            <div className="space-y-3 mb-6">
                {plans.map((plan, i) => (
                    <div key={i} className={`relative bg-black/40 backdrop-blur-sm border ${plan.popular ? 'border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.15)] scale-[1.02]' : 'border-yellow-100/10'} p-3 rounded-2xl flex items-center gap-3 text-left overflow-hidden`}>
                        {plan.popular && (
                            <div className="absolute top-0 right-0 bg-amber-400 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg z-10">Popular</div>
                        )}
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-white shadow-inner flex-shrink-0`}>
                            <div className="w-5 h-5">{plan.icon}</div>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-yellow-50 font-bold text-sm tracking-wide">{plan.name}</h4>
                            <div className="flex items-center gap-1.5 text-[10px] text-yellow-50/50 mt-0.5">
                                <span>{plan.questions}</span> <span className="w-1 h-1 bg-yellow-100/20 rounded-full" /> <span>{plan.speed}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-amber-400 font-black text-base lg:text-lg">{plan.price}</div>
                            <div className="text-[9px] text-yellow-50/30 font-semibold uppercase tracking-wider">/mo</div>
                        </div>
                    </div>
                ))}
            </div>

            <ContinueButton onClick={onNext}>
                Continue
                <div className="w-4 h-4 ml-1">{Icons.arrowRight}</div>
            </ContinueButton>
        </div>
    )
}

// ============================================================
// STEP 11: FINAL CTA
// ============================================================
export function FinalCallToActionStep({ data }: StepProps) {
    const [visible, setVisible] = useState(false)
    useEffect(() => { setTimeout(() => setVisible(true), 200) }, [])

    return (
        <div className={`text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 animate-pulse" />
                <div className="absolute inset-2 rounded-full border border-purple-400/30 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                    <div className="w-10 h-10 text-purple-300">{Icons.sparkles}</div>
                </div>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-yellow-50 mb-4 leading-tight">
                Your Cosmic Journey<br />
                <span className="text-amber-300">Awaits You</span>
            </h2>

            <p className="text-yellow-50/70 text-base max-w-sm mx-auto mb-8 leading-relaxed">
                Connect your soul signature to our dashboard. Complete your profile, verify your humanity via email, and upload your palms to generate your actual destiny chart!
            </p>

            <button
                onClick={() => { window.location.href = '/register' }}
                className="w-full py-4 px-6 rounded-2xl font-bold text-base sm:text-lg bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-900 shadow-[0_0_30px_rgba(251,191,36,0.3)] hover:shadow-[0_0_40px_rgba(251,191,36,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-4"
            >
                <div className="w-5 h-5">{Icons.person}</div>
                Create Free Profile
            </button>

            <p className="text-yellow-50/40 text-xs mt-6">
                Already have an account? <a href="/login" className="text-amber-400/80 hover:text-amber-300 underline underline-offset-2">Sign in here</a>
            </p>
        </div>
    )
}
