'use client'

/**
 * Admin console.
 *
 * Two things you will change weekly: which providers run, and what the
 * astrologer sounds like. Everything else stays in environment variables.
 *
 * Access is decided by the server (/api/admin/me). A non-admin gets a 404 from
 * every admin endpoint, so this page shows nothing rather than a login prompt.
 */

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Setting {
  key: string
  value: string | null
  source: 'database' | 'environment' | 'default'
  env: string
  description: string
}

interface PromptVersion {
  id: string
  version: number
  content: string
  is_active: boolean
  notes: string | null
  created_at: string
}

interface AdminInfo {
  email: string
  role: string
  canWrite: boolean
}

type Tab = 'settings' | 'prompt'

export default function AdminPage() {
  const [admin, setAdmin] = useState<AdminInfo | null>(null)
  const [checking, setChecking] = useState(true)
  const [tab, setTab] = useState<Tab>('settings')

  const [settings, setSettings] = useState<Setting[]>([])
  const [status, setStatus] = useState<Record<string, unknown> | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [promptDraft, setPromptDraft] = useState('')
  const [promptNotes, setPromptNotes] = useState('')
  const [usingBuiltIn, setUsingBuiltIn] = useState(false)

  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; kind: 'ok' | 'error' } | null>(null)

  const notify = (text: string, kind: 'ok' | 'error' = 'ok') => {
    setMessage({ text, kind })
    setTimeout(() => setMessage(null), 5000)
  }

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setAdmin(j?.data ?? null))
      .catch(() => setAdmin(null))
      .finally(() => setChecking(false))
  }, [])

  const loadSettings = useCallback(async () => {
    const res = await fetch('/api/admin/settings')
    if (!res.ok) return
    const json = await res.json()
    setSettings(json.data.settings)
    setStatus(json.data.status)
    setDrafts(
      Object.fromEntries(json.data.settings.map((s: Setting) => [s.key, s.value ?? '']))
    )
  }, [])

  const loadPrompt = useCallback(async () => {
    const res = await fetch('/api/admin/prompts?name=astrologer_persona')
    if (!res.ok) return
    const json = await res.json()
    setVersions(json.data.versions)
    setUsingBuiltIn(json.data.usingBuiltInDefault)
    setPromptDraft(json.data.active?.content ?? '')
  }, [])

  useEffect(() => {
    if (!admin) return
    loadSettings()
    loadPrompt()
  }, [admin, loadSettings, loadPrompt])

  const saveSetting = async (key: string, value: string | null) => {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Could not save')
      notify(json.data.message)
      await loadSettings()
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not save', 'error')
    } finally {
      setBusy(false)
    }
  }

  const savePrompt = async () => {
    if (!promptDraft.trim()) return notify('The prompt cannot be empty', 'error')
    setBusy(true)
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'astrologer_persona',
          content: promptDraft,
          notes: promptNotes || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Could not save')
      notify(json.data.message)
      setPromptNotes('')
      await loadPrompt()
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not save', 'error')
    } finally {
      setBusy(false)
    }
  }

  const rollback = async (id: string, version: number) => {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'astrologer_persona', activateId: id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Could not activate')
      notify(`Version ${version} is now active.`)
      await loadPrompt()
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not activate', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <p className="text-text-secondary">Checking access…</p>
      </main>
    )
  }

  if (!admin) {
    return (
      <main className="min-h-screen bg-gradient-soft flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Not found</h1>
          <p className="text-text-secondary mb-6">This page is not available.</p>
          <Link href="/dashboard" className="text-gold-600 hover:text-gold-700 font-medium">
            Back to dashboard
          </Link>
        </div>
      </main>
    )
  }

  const sourceBadge = (source: Setting['source']) => {
    const styles: Record<Setting['source'], string> = {
      database: 'bg-gold-100 text-gold-700',
      environment: 'bg-beige-200 text-text-secondary',
      default: 'bg-beige-100 text-text-tertiary',
    }
    const labels: Record<Setting['source'], string> = {
      database: 'set here',
      environment: 'from environment',
      default: 'default',
    }
    return (
      <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${styles[source]}`}>
        {labels[source]}
      </span>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-soft p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Admin</h1>
              <p className="text-text-secondary text-sm mt-1">
                {admin.email} · {admin.role}
                {!admin.canWrite && ' · read only'}
              </p>
            </div>
            <Link href="/dashboard" className="text-gold-600 hover:text-gold-700 text-sm font-medium">
              Back to dashboard
            </Link>
          </div>

          <nav className="flex gap-2 mt-6" role="tablist">
            {(['settings', 'prompt'] as Tab[]).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  tab === t
                    ? 'bg-gold-500 text-white'
                    : 'bg-white/70 text-text-secondary hover:bg-white'
                }`}
              >
                {t === 'settings' ? 'Providers' : 'Astrologer voice'}
              </button>
            ))}
          </nav>
        </header>

        {message && (
          <div
            role="status"
            className={`mb-6 px-4 py-3 rounded-xl text-sm ${
              message.kind === 'ok'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {tab === 'settings' && (
          <section className="space-y-4">
            {status && (
              <div className="bg-white/80 rounded-2xl p-5 border border-beige-300/50">
                <h2 className="font-semibold text-text-primary mb-3">Live status</h2>
                <pre className="text-xs text-text-secondary overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(status, null, 2)}
                </pre>
              </div>
            )}

            {settings.map((s) => (
              <div key={s.key} className="bg-white/80 rounded-2xl p-5 border border-beige-300/50">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <code className="text-sm font-semibold text-text-primary">{s.key}</code>
                  {sourceBadge(s.source)}
                </div>
                <p className="text-sm text-text-secondary mb-3">{s.description}</p>

                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    value={drafts[s.key] ?? ''}
                    disabled={!admin.canWrite || busy}
                    onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })}
                    placeholder={`Unset — falls back to ${s.env}`}
                    className="flex-1 min-w-[200px] px-3 py-2 bg-white border border-beige-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 disabled:opacity-60"
                  />
                  <button
                    onClick={() => saveSetting(s.key, drafts[s.key] || null)}
                    disabled={!admin.canWrite || busy}
                    className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    Save
                  </button>
                  {s.source === 'database' && (
                    <button
                      onClick={() => saveSetting(s.key, null)}
                      disabled={!admin.canWrite || busy}
                      className="px-4 py-2 bg-beige-200 hover:bg-beige-300 text-text-primary rounded-lg text-sm font-medium disabled:opacity-50"
                      title={`Revert to the ${s.env} environment variable`}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === 'prompt' && (
          <section className="space-y-6">
            {usingBuiltIn && (
              <div className="bg-beige-100 border border-beige-300 rounded-xl px-4 py-3 text-sm text-text-secondary">
                No saved version yet — readings are using the built-in prompt from
                {' '}<code>lib/prompts/astrologer-persona.ts</code>. Saving below creates version 1.
              </div>
            )}

            <div className="bg-white/80 rounded-2xl p-5 border border-beige-300/50">
              <label htmlFor="prompt" className="block font-semibold text-text-primary mb-2">
                System prompt
              </label>
              <p className="text-sm text-text-secondary mb-3">
                This is what the astrologer is told before every reading. Changes apply to new
                readings within a minute — existing answers are unaffected.
              </p>
              <textarea
                id="prompt"
                value={promptDraft}
                disabled={!admin.canWrite || busy}
                onChange={(e) => setPromptDraft(e.target.value)}
                rows={18}
                className="w-full px-3 py-2 bg-white border border-beige-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gold-400 disabled:opacity-60"
              />

              <div className="flex gap-2 mt-3 flex-wrap items-center">
                <input
                  type="text"
                  value={promptNotes}
                  disabled={!admin.canWrite || busy}
                  onChange={(e) => setPromptNotes(e.target.value)}
                  placeholder="What changed? (optional)"
                  className="flex-1 min-w-[200px] px-3 py-2 bg-white border border-beige-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 disabled:opacity-60"
                />
                <button
                  onClick={savePrompt}
                  disabled={!admin.canWrite || busy}
                  className="px-5 py-2 bg-gold-500 hover:bg-gold-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {busy ? 'Saving…' : 'Save as new version'}
                </button>
              </div>
            </div>

            {versions.length > 0 && (
              <div className="bg-white/80 rounded-2xl p-5 border border-beige-300/50">
                <h2 className="font-semibold text-text-primary mb-3">History</h2>
                <ul className="divide-y divide-beige-200">
                  {versions.map((v) => (
                    <li key={v.id} className="py-3 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary">
                          Version {v.version}
                          {v.is_active && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-green-100 text-green-700">
                              active
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-text-tertiary mt-0.5">
                          {new Date(v.created_at).toLocaleString()}
                          {v.notes ? ` · ${v.notes}` : ''}
                        </p>
                      </div>
                      {!v.is_active && admin.canWrite && (
                        <button
                          onClick={() => rollback(v.id, v.version)}
                          disabled={busy}
                          className="shrink-0 px-3 py-1.5 bg-beige-200 hover:bg-beige-300 text-text-primary rounded-lg text-xs font-medium disabled:opacity-50"
                        >
                          Make active
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
