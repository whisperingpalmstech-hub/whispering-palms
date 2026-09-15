'use client'

import { useEffect, useState } from 'react'
import { getDictionaryLanguages, LONG_TAIL_LANGUAGES } from '@/lib/i18n/registry'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CountryInput from '@/app/components/CountryInput'
import DatePicker from '@/app/components/DatePicker'
import TimePicker from '@/app/components/TimePicker'
import PlaceInput from '@/app/components/PlaceInput'
import Toast from '@/app/components/Toast'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'
import { useI18n } from '@/app/hooks/useI18n'

interface User {
  id: string
  email: string
  name?: string
  country?: string
  preferred_language?: string
  timezone?: string
}

interface Profile {
  date_of_birth?: string
  time_of_birth?: string
  place_of_birth?: string
  birth_timezone?: string
}

interface PalmImage {
  id: string
  palm_type: string
  signed_url?: string
  uploaded_at: string
  matching_status: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [palmImages, setPalmImages] = useState<PalmImage[]>([])
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    preferred_language: 'en',
    timezone: '',
    date_of_birth: '',
    time_of_birth: '',
    place_of_birth: '',
    birth_timezone: '',
    voice_gender: '',
    voice_speaking_rate: '',
  })
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info'; isVisible: boolean }>({
    message: '',
    type: 'info',
    isVisible: false,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const userResponse = await fetch('/api/auth/me')
      const userResult = await userResponse.json()

      if (!userResponse.ok) {
        router.push('/login')
        return
      }

      setUser(userResult.data.user)
      setFormData(prev => ({
        ...prev,
        name: userResult.data.user.name || '',
        country: userResult.data.user.country || '',
        preferred_language: userResult.data.user.preferred_language || 'en',
        timezone: userResult.data.user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      }))

      const profileResponse = await fetch('/api/user/profile')
      const profileResult = await profileResponse.json()

      if (profileResponse.ok && profileResult.data?.profile) {
        setProfile(profileResult.data.profile)
        // Format time_of_birth from "HH:MM:SS" to "HH:MM" for TimePicker
        const timeOfBirth = profileResult.data.profile.time_of_birth || ''
        const formattedTime = timeOfBirth.includes(':') ? timeOfBirth.substring(0, 5) : timeOfBirth

        setFormData(prev => ({
          ...prev,
          date_of_birth: profileResult.data.profile.date_of_birth || '',
          time_of_birth: formattedTime,
          place_of_birth: profileResult.data.profile.place_of_birth || '',
          birth_timezone: profileResult.data.profile.birth_timezone || '',
          voice_gender: profileResult.data.profile.voice_gender || '',
          voice_speaking_rate:
            profileResult.data.profile.voice_speaking_rate != null
              ? String(profileResult.data.profile.voice_speaking_rate)
              : '',
        }))
      }

      const palmResponse = await fetch('/api/user/profile/palm-images')
      const palmResult = await palmResponse.json()

      if (palmResponse.ok && palmResult.data?.palmImages) {
        setPalmImages(palmResult.data.palmImages)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          country: formData.country,
          preferred_language: formData.preferred_language,
          timezone: formData.timezone,
          date_of_birth: formData.date_of_birth,
          time_of_birth: formData.time_of_birth,
          place_of_birth: formData.place_of_birth,
          birth_timezone: formData.birth_timezone,
          voice_gender: formData.voice_gender || null,
          voice_speaking_rate: formData.voice_speaking_rate
            ? Number(formData.voice_speaking_rate)
            : null,
        }),
      })

      await fetchData()
      setToast({ message: t('settings.profileUpdated'), type: 'success', isVisible: true })
    } catch (error) {
      setToast({ message: t('settings.profileUpdateFailed'), type: 'error', isVisible: true })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gold-50 via-ivory-100 to-gold-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold-400/30 border-t-gold-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-primary text-xl ">{t('common.loading')}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gold-50 via-ivory-100 to-gold-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto py-4 sm:py-6 px-2 sm:px-4">
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary mb-1 sm:mb-2">{t('settings.title')}</h1>
            <p className="text-text-secondary text-sm sm:text-base">{t('settings.manageProfile')}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <LanguageSwitcher />
            <Link
              href="/dashboard"
              className="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 bg-white border-2 border-beige-300 hover:border-gold-400 text-text-primary rounded-lg sm:rounded-xl font-semibold transition-all shadow-soft hover:shadow-soft-lg flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t('settings.backToDashboard')}
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gradient-to-br from-gold-50/90 via-ivory-100/90 to-gold-50/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-gold-200/50 shadow-soft-xl">
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-4 sm:mb-6">{t('settings.basicInformation')}</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-text-primary font-medium mb-2 text-sm">{t('auth.fullName')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-beige-300 rounded-xl text-text-primary placeholder-text-light focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 transition-all"
                  placeholder={t('settings.yourFullName')}
                />
              </div>

              <div>
                <label className="block text-text-primary font-medium mb-2 text-sm">{t('auth.email')}</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 bg-beige-50 border border-beige-200 rounded-xl text-text-secondary cursor-not-allowed"
                />
                <p className="text-text-tertiary text-xs mt-1">{t('settings.emailCannotChange')}</p>
              </div>

              <div>
                <label className="block text-text-primary font-medium mb-2 text-sm">{t('auth.country')}</label>
                <CountryInput
                  value={formData.country}
                  onChange={(value) => setFormData({ ...formData, country: value })}
                />
              </div>

              <div>
                <label className="block text-text-primary font-medium mb-2 text-sm">{t('onboarding.preferredLanguage')}</label>
                <select
                  value={formData.preferred_language}
                  onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-beige-300 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 transition-all"
                >
                  {/* Languages with a reviewed interface translation. */}
                  <optgroup label="Full experience">
                    {getDictionaryLanguages().map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.nativeName} — {lang.name}
                        {lang.tts ? '' : ' (no audio)'}
                      </option>
                    ))}
                  </optgroup>
                  {/* Readings are translated; the interface stays in English. */}
                  <optgroup label="Readings translated, interface in English">
                    {LONG_TAIL_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.nativeName} — {lang.name}
                        {lang.tts ? '' : ' (no audio)'}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label
                  htmlFor="voice-gender"
                  className="block text-text-primary font-medium mb-2 text-sm"
                >
                  Narration voice
                </label>
                <select
                  id="voice-gender"
                  value={formData.voice_gender}
                  onChange={(e) => setFormData({ ...formData, voice_gender: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-beige-300 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 transition-all"
                >
                  <option value="">Use the default voice</option>
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="NEUTRAL">Neutral</option>
                </select>
                <p className="text-xs text-text-tertiary mt-1">
                  Applies to spoken readings on the Flame and SuperFlame plans.
                </p>
              </div>

              <div>
                <label
                  htmlFor="voice-rate"
                  className="block text-text-primary font-medium mb-2 text-sm"
                >
                  Speaking speed
                  {formData.voice_speaking_rate && ` — ${formData.voice_speaking_rate}×`}
                </label>
                <input
                  id="voice-rate"
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.05"
                  value={formData.voice_speaking_rate || '1'}
                  onChange={(e) =>
                    setFormData({ ...formData, voice_speaking_rate: e.target.value })
                  }
                  className="w-full accent-gold-500"
                />
                <div className="flex justify-between text-xs text-text-tertiary">
                  <span>Slower</span>
                  <span>Normal</span>
                  <span>Faster</span>
                </div>
              </div>
            </div>
          </div>

          {/* Birth Details */}
          <div className="bg-gradient-to-br from-gold-50/90 via-ivory-100/90 to-gold-50/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-gold-200/50 shadow-soft-xl">
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-4 sm:mb-6">{t('settings.birthDetails')}</h2>
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-text-primary font-medium mb-2 text-sm">{t('onboarding.dateOfBirth')}</label>
                  <DatePicker
                    value={formData.date_of_birth}
                    onChange={(date) => setFormData({ ...formData, date_of_birth: date })}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="block text-text-primary font-medium mb-2 text-sm">{t('onboarding.timeOfBirth')}</label>
                  <TimePicker
                    value={formData.time_of_birth}
                    onChange={(time) => setFormData({ ...formData, time_of_birth: time })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-primary font-medium mb-2 text-sm">{t('onboarding.placeOfBirth')}</label>
                <PlaceInput
                  value={formData.place_of_birth}
                  onChange={(value) => setFormData({ ...formData, place_of_birth: value })}
                  onTimezoneDetected={(timezone) => setFormData({ ...formData, birth_timezone: timezone })}
                />
              </div>
            </div>
          </div>

          {/* Palm Images */}
          <div className="bg-gradient-to-br from-gold-50/90 via-ivory-100/90 to-gold-50/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-gold-200/50 shadow-soft-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-primary ">{t('settings.palmImages')}</h2>
              <Link
                href="/onboarding/palm-upload"
                className="px-5 py-2.5 bg-gradient-to-r from-peach-500 to-peach-600 hover:from-peach-600 hover:to-peach-700 text-white rounded-xl font-semibold transition-all shadow-soft hover:shadow-soft-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {t('settings.editPalmImages')}
              </Link>
            </div>

            {palmImages.length === 0 ? (
              <p className="text-text-secondary">{t('settings.noPalmImages')}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {palmImages.map((image) => (
                  <div key={image.id} className="relative group">
                    {image.signed_url ? (
                      <img
                        src={image.signed_url}
                        alt={image.palm_type}
                        className="w-full h-32 object-cover rounded-xl border-2 border-beige-300 group-hover:border-gold-400 transition-all shadow-soft"
                      />
                    ) : (
                      <div className="w-full h-32 bg-beige-100 rounded-xl border-2 border-beige-300 flex items-center justify-center">
                        <span className="text-text-tertiary text-sm">{image.palm_type}</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 rounded-b-xl">
                      {image.palm_type.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3.5 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white rounded-xl font-semibold transition-all shadow-soft hover:shadow-soft-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('settings.saving')}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('settings.saveChanges')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </main>
  )
}
