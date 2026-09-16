// ============================================================
// QUIZ STEPS - Barrel Export
// Combines all step components and defines the step order
// ============================================================
export type { QuizData, StepProps } from './SharedUI'
export { INITIAL_QUIZ_DATA } from './SharedUI'

import {
    WelcomeStep, GenderStep, AgeStep, BridgeScreen1, AstrologyFamiliarityStep,
    PastReadingsStep, ChallengesStep, BridgeScreen2, LifeAreasStep,
    BridgeScreen3, FinalCallToActionStep
} from './AssessmentSteps'

// Re-export all steps
export {
    WelcomeStep, GenderStep, AgeStep, BridgeScreen1, AstrologyFamiliarityStep,
    PastReadingsStep, ChallengesStep, BridgeScreen2, LifeAreasStep,
    BridgeScreen3, FinalCallToActionStep
}

// ============================================================
// STEP CONFIGURATION
// Defines the order and which steps show the progress bar
// ============================================================
export const QUIZ_STEPS = [
    // Phase 1: Welcome
    { component: WelcomeStep, showProgress: false },

    // Phase 2: Assessment - Part 1
    { component: GenderStep, showProgress: true },
    { component: AgeStep, showProgress: true },
    { component: BridgeScreen1, showProgress: false }, // Explains Vedic Wisdom

    // Assessment - Part 2
    { component: AstrologyFamiliarityStep, showProgress: true },
    { component: BridgeScreen2, showProgress: false }, // Explains "Ask the Oracle"

    // Assessment - Part 3
    { component: PastReadingsStep, showProgress: true },
    { component: ChallengesStep, showProgress: true },
    { component: BridgeScreen3, showProgress: false }, // Explains Premium Plans

    // Assessment - Final
    { component: LifeAreasStep, showProgress: true },

    // Phase 3: Final Call To Action (Redirect to Register)
    { component: FinalCallToActionStep, showProgress: false },
]
