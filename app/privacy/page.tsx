'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import GlobalFooter from '@/app/components/GlobalFooter'
import { useI18n } from '@/app/hooks/useI18n'

export default function PrivacyPage() {
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
                    <h1 className="text-4xl font-bold text-text-primary mb-4">Privacy Policy</h1>
                    <p className="text-text-tertiary mb-8">Last Updated: January 29, 2026</p>

                    <div className="prose prose-lg max-w-none space-y-8">
                        {/* Introduction */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">1. Introduction</h2>
                            <p className="text-text-secondary leading-relaxed">
                                At Whispering Palms ("we," "our," or "us"), we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our palmistry and Vedic astrology services.
                            </p>
                            <p className="text-text-secondary leading-relaxed mt-4">
                                By using our Services, you consent to the data practices described in this policy. We take the security of your sensitive information—including birth details and palm images—extremely seriously.
                            </p>
                        </section>

                        {/* Information Collection */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">2. Information We Collect</h2>

                            <h3 className="text-xl font-semibold text-text-primary mt-6 mb-3">2.1 Personal Information</h3>
                            <p className="text-text-secondary leading-relaxed mb-4">
                                We collect information that you provide directly to us when you create an account, complete your profile, or communicate with us. This includes:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-text-secondary">
                                <li>Name and email address</li>
                                <li>Birth details: Date of birth, time of birth, and place of birth</li>
                                <li>Gender and country of residence</li>
                                <li>Palm images (when uploaded for analysis)</li>
                                <li>Any questions you submit to our experts</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-text-primary mt-6 mb-3">2.2 Automatically Collected Information</h3>
                            <p className="text-text-secondary leading-relaxed mb-4">
                                When you access our Services, we may automatically collect certain information about your device and usage, including:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-text-secondary">
                                <li>IP address and device identifiers</li>
                                <li>Browser type and operating system</li>
                                <li>Pages viewed and time spent on the site</li>
                                <li>Language preferences</li>
                            </ul>
                        </section>

                        {/* Use of Information */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">3. How We Use Your Information</h2>
                            <p className="text-text-secondary leading-relaxed mb-4">
                                We use the collected information for various purposes, including:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-text-secondary">
                                <li>Generating personalized birth chart analyses and horoscopes</li>
                                <li>Performing palmistry readings based on your uploaded images</li>
                                <li>Providing expert answers to your astrology questions via email</li>
                                <li>Processing your subscription and payments</li>
                                <li>Improving and optimizing our Services and user experience</li>
                                <li>Communicating with you about your account and updates</li>
                                <li>Ensuring the security of our Services and preventing fraud</li>
                            </ul>
                        </section>

                        {/* Data Sharing */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">4. Sharing Your Information</h2>
                            <p className="text-text-secondary leading-relaxed">
                                We do not sell your personal information, birth details, or palm images to third parties. We may share your information only in the following limited circumstances:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-text-secondary mt-4">
                                <li><strong>Service Providers:</strong> We may share information with trusted vendors and service providers (such as payment processors, email services, and hosting providers) who perform services on our behalf and are bound by confidentiality obligations.</li>
                                <li><strong>Legal Requirements:</strong> We may disclose information if required to do so by law or in response to valid requests by public authorities.</li>
                                <li><strong>Business Transfers:</strong> If we are involved in a merger, acquisition, or asset sale, your information may be transferred as a business asset.</li>
                            </ul>
                        </section>

                        {/* Data Security */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">5. Data Security</h2>
                            <p className="text-text-secondary leading-relaxed">
                                We implement industry-standard security measures to protect your information, including:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-text-secondary mt-4">
                                <li>Encryption of data in transit (SSL/TLS) and at rest</li>
                                <li>Secure storage of palm images with restricted access</li>
                                <li>Regular security audits and updates to our systems</li>
                                <li>Strict internal access controls for sensitive user data</li>
                            </ul>
                            <p className="text-text-secondary leading-relaxed mt-4 italic">
                                Note: While we strive to use commercially acceptable means to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure.
                            </p>
                        </section>

                        {/* Your Rights */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">6. Your Data Rights</h2>
                            <p className="text-text-secondary leading-relaxed mb-4">
                                Depending on your location, you may have certain rights regarding your personal data:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-text-secondary">
                                <li>The right to access the data we hold about you</li>
                                <li>The right to rectify inaccurate or incomplete information</li>
                                <li>The right to request the deletion of your personal data</li>
                                <li>The right to withdraw consent for data processing (such as palm image analysis)</li>
                                <li>The right to export your data in a portable format</li>
                            </ul>
                            <p className="text-text-secondary leading-relaxed mt-4">
                                To exercise any of these rights, please contact us at privacy@whispering-palms.org.
                            </p>
                        </section>

                        {/* Data Retention */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">7. Data Retention</h2>
                            <p className="text-text-secondary leading-relaxed">
                                We retain your personal information for as long as your account is active or as needed to provide you with Services. We will also retain and use your information as necessary to comply with our legal obligations, resolve disputes, and enforce our agreements.
                            </p>
                        </section>

                        {/* Children's Privacy */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">8. Children's Privacy</h2>
                            <p className="text-text-secondary leading-relaxed">
                                Our Services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child under 18, we will take steps to delete that information immediately.
                            </p>
                        </section>

                        {/* Changes to Policy */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">9. Changes to This Policy</h2>
                            <p className="text-text-secondary leading-relaxed">
                                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top. We encourage you to review this policy periodically for any changes.
                            </p>
                        </section>

                        {/* Contact Information */}
                        <section>
                            <h2 className="text-2xl font-semibold text-text-primary mb-4">10. Contact Us</h2>
                            <p className="text-text-secondary leading-relaxed">
                                If you have any questions or concerns about this Privacy Policy or our data practices, please contact our Data Protection Officer at:
                            </p>
                            <div className="mt-4 p-6 bg-gold-50 rounded-lg border border-gold-200">
                                <p className="text-text-primary font-semibold">Whispering Palms Privacy Team</p>
                                <p className="text-text-secondary mt-2">Email: privacy@whispering-palms.org</p>
                                <p className="text-text-secondary">Address: [Your Business Address, City, Country]</p>
                            </div>
                        </section>
                    </div>
                </div>
                <GlobalFooter />
            </div>
        </main>
    )
}
