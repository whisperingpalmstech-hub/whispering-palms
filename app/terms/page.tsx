'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import GlobalFooter from '@/app/components/GlobalFooter'
import { useI18n } from '@/app/hooks/useI18n'

export default function TermsPage() {
    const [mounted, setMounted] = useState(false)
    const { t } = useI18n()

    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <main className="min-h-screen bg-gradient-soft">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full bg-gradient-to-br from-gold-50/95 via-ivory-100/95 to-gold-50/95 backdrop-blur-lg border-b border-gold-200/30 shadow-soft">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <Link href="/" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <span className="text-2xl font-bold text-text-primary">← {t('dashboard.title')}</span>
                    </Link>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className={`bg-white rounded-2xl shadow-soft-lg p-8 md:p-12 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <h1 className="text-4xl font-bold text-text-primary mb-4">Terms & Conditions</h1>
                    <p className="text-text-tertiary mb-8">Last Updated: January 29, 2026</p>

                    <div className="prose prose-lg max-w-none space-y-8">
                        {/* Introduction */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">1. Introduction</h2>
                            <p className="text-text-secondary leading-relaxed">
                                Welcome to Whispering Palms ("we," "our," or "us"). These Terms and Conditions ("Terms") govern your access to and use of our palmistry and Vedic astrology services, including our website, mobile applications, and all related services (collectively, the "Services").
                            </p>
                            <p className="text-text-secondary leading-relaxed mt-4">
                                By accessing or using our Services, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our Services.
                            </p>
                        </section>

                        {/* Eligibility */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">2. Eligibility</h2>
                            <p className="text-text-secondary leading-relaxed">
                                You must be at least 18 years old to use our Services. By using our Services, you represent and warrant that you are at least 18 years of age and have the legal capacity to enter into these Terms.
                            </p>
                        </section>

                        {/* Account Registration */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">3. Account Registration</h2>
                            <p className="text-text-secondary leading-relaxed mb-4">
                                To access certain features of our Services, you must create an account. You agree to:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-text-secondary">
                                <li>Provide accurate, current, and complete information during registration</li>
                                <li>Maintain and promptly update your account information</li>
                                <li>Maintain the security of your password and account</li>
                                <li>Accept all responsibility for activities that occur under your account</li>
                                <li>Notify us immediately of any unauthorized use of your account</li>
                            </ul>
                        </section>

                        {/* Services Description */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">4. Services Description</h2>
                            <p className="text-text-secondary leading-relaxed mb-4">
                                Whispering Palms provides personalized palmistry and Vedic astrology services, including but not limited to:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-text-secondary">
                                <li>Birth chart analysis based on your date, time, and place of birth</li>
                                <li>Palm reading analysis based on uploaded palm images</li>
                                <li>Personalized astrological insights and guidance</li>
                                <li>Question-and-answer services via email</li>
                                <li>Voice narration of readings (premium plans)</li>
                            </ul>
                            <p className="text-text-secondary leading-relaxed mt-4 font-semibold">
                                Important Disclaimer: Our Services are for entertainment and educational purposes only. They should not be used as a substitute for professional advice in areas such as legal, financial, medical, or psychological matters.
                            </p>
                        </section>

                        {/* Subscription Plans */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">5. Subscription Plans & Payments</h2>

                            <h3 className="text-xl font-semibold text-text-primary mt-6 mb-3">5.1 Subscription Tiers</h3>
                            <p className="text-text-secondary leading-relaxed">
                                We offer multiple subscription tiers (Basic, Spark, Flame, SuperFlame) with varying features and pricing. Details of each plan are available on our pricing page.
                            </p>

                            <h3 className="text-xl font-semibold text-text-primary mt-6 mb-3">5.2 Billing</h3>
                            <ul className="list-disc pl-6 space-y-2 text-text-secondary">
                                <li>Subscriptions are billed on a monthly or annual basis, as selected during checkout</li>
                                <li>All fees are non-refundable except as required by law</li>
                                <li>You authorize us to charge your payment method for all fees incurred</li>
                                <li>Prices are subject to change with 30 days' notice</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-text-primary mt-6 mb-3">5.3 Cancellation</h3>
                            <p className="text-text-secondary leading-relaxed">
                                You may cancel your subscription at any time through your account settings. Cancellation will be effective at the end of your current billing period. No refunds will be provided for partial subscription periods.
                            </p>
                        </section>

                        {/* User Content */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">6. User Content & Privacy</h2>

                            <h3 className="text-xl font-semibold text-text-primary mt-6 mb-3">6.1 Palm Images</h3>
                            <p className="text-text-secondary leading-relaxed">
                                By uploading palm images to our Services, you grant us a limited, non-exclusive license to use, store, and process these images solely for the purpose of providing palmistry analysis services to you.
                            </p>

                            <h3 className="text-xl font-semibold text-text-primary mt-6 mb-3">6.2 Birth Details</h3>
                            <p className="text-text-secondary leading-relaxed">
                                Your birth details (date, time, place) are stored securely and used exclusively to generate personalized astrological insights. We do not share this information with third parties except as described in our Privacy Policy.
                            </p>

                            <h3 className="text-xl font-semibold text-text-primary mt-6 mb-3">6.3 Questions & Communications</h3>
                            <p className="text-text-secondary leading-relaxed">
                                All questions submitted and responses provided are stored for quality assurance and service improvement purposes. Your communications with our astrologers are confidential and will not be shared publicly.
                            </p>
                        </section>

                        {/* Prohibited Conduct */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">7. Prohibited Conduct</h2>
                            <p className="text-text-secondary leading-relaxed mb-4">
                                You agree not to:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-text-secondary">
                                <li>Use our Services for any illegal purpose or in violation of any laws</li>
                                <li>Upload images of someone else without their consent</li>
                                <li>Impersonate any person or entity</li>
                                <li>Attempt to gain unauthorized access to our systems or networks</li>
                                <li>Interfere with or disrupt the Services or servers</li>
                                <li>Use automated systems (bots, scrapers) to access the Services</li>
                                <li>Resell or redistribute our Services without permission</li>
                                <li>Submit false or misleading information</li>
                            </ul>
                        </section>

                        {/* Intellectual Property */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">8. Intellectual Property</h2>
                            <p className="text-text-secondary leading-relaxed">
                                All content, features, and functionality of our Services, including but not limited to text, graphics, logos, icons, images, audio clips, and software, are the exclusive property of Whispering Palms and are protected by international copyright, trademark, and other intellectual property laws.
                            </p>
                            <p className="text-text-secondary leading-relaxed mt-4">
                                You may not copy, reproduce, modify, distribute, or create derivative works based on our content without our express written permission.
                            </p>
                        </section>

                        {/* Disclaimer of Warranties */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">9. Disclaimer of Warranties</h2>
                            <p className="text-text-secondary leading-relaxed font-semibold mb-4">
                                OUR SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
                            </p>
                            <p className="text-text-secondary leading-relaxed">
                                We do not warrant that:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-text-secondary mt-4">
                                <li>Our Services will be uninterrupted, secure, or error-free</li>
                                <li>The results obtained from our Services will be accurate or reliable</li>
                                <li>Any predictions, insights, or guidance provided will come to pass</li>
                                <li>Any defects in the Services will be corrected</li>
                            </ul>
                            <p className="text-text-secondary leading-relaxed mt-4 font-semibold">
                                ASTROLOGY AND PALMISTRY ARE INTERPRETIVE ARTS. WE MAKE NO GUARANTEES ABOUT THE ACCURACY, COMPLETENESS, OR USEFULNESS OF ANY READINGS OR PREDICTIONS PROVIDED.
                            </p>
                        </section>

                        {/* Limitation of Liability */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">10. Limitation of Liability</h2>
                            <p className="text-text-secondary leading-relaxed">
                                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WHISPERING PALMS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-text-secondary mt-4">
                                <li>Your use or inability to use the Services</li>
                                <li>Any unauthorized access to or use of our servers and/or any personal information stored therein</li>
                                <li>Any interruption or cessation of transmission to or from the Services</li>
                                <li>Any decisions made based on our astrological or palmistry readings</li>
                            </ul>
                            <p className="text-text-secondary leading-relaxed mt-4">
                                IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY.
                            </p>
                        </section>

                        {/* Indemnification */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">11. Indemnification</h2>
                            <p className="text-text-secondary leading-relaxed">
                                You agree to indemnify, defend, and hold harmless Whispering Palms and its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with your access to or use of the Services, your violation of these Terms, or your violation of any third-party rights.
                            </p>
                        </section>

                        {/* Modifications */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">12. Modifications to Services and Terms</h2>
                            <p className="text-text-secondary leading-relaxed">
                                We reserve the right to modify, suspend, or discontinue the Services (or any part thereof) at any time, with or without notice. We may also modify these Terms at any time by posting the revised Terms on our website. Your continued use of the Services after such changes constitutes your acceptance of the new Terms.
                            </p>
                        </section>

                        {/* Termination */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">13. Termination</h2>
                            <p className="text-text-secondary leading-relaxed">
                                We may terminate or suspend your account and access to the Services immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Services will immediately cease.
                            </p>
                        </section>

                        {/* Governing Law */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">14. Governing Law & Dispute Resolution</h2>
                            <p className="text-text-secondary leading-relaxed">
                                These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising out of or relating to these Terms or the Services shall be resolved through binding arbitration in accordance with the Indian Arbitration and Conciliation Act, 1996.
                            </p>
                        </section>

                        {/* Severability */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">15. Severability</h2>
                            <p className="text-text-secondary leading-relaxed">
                                If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.
                            </p>
                        </section>

                        {/* Contact Information */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">16. Contact Us</h2>
                            <p className="text-text-secondary leading-relaxed">
                                If you have any questions about these Terms, please contact us at:
                            </p>
                            <div className="mt-4 p-6 bg-gold-50 rounded-lg border border-gold-200">
                                <p className="text-text-primary font-semibold">Whispering Palms</p>
                                <p className="text-text-secondary mt-2">Email: support@whispering-palms.org</p>
                                <p className="text-text-secondary">Legal Department: legal@whispering-palms.org</p>
                            </div>
                        </section>

                        {/* Acceptance */}
                        <section className="border-t-2 border-gold-200 pt-8 mt-12">
                            <p className="text-text-secondary leading-relaxed font-semibold">
                                BY USING OUR SERVICES, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS AND CONDITIONS.
                            </p>
                        </section>
                    </div>
                </div>
                <GlobalFooter />
            </div>
        </main>
    )
}
