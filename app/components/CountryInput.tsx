'use client'

import { useState, useRef, useEffect, useMemo, useId } from 'react'
import {
  filterCountries,
  getCountryName,
  normalizeCountry,
  type Country,
} from '@/lib/utils/countries'
import { useTranslation } from '@/app/contexts/TranslationContext'

interface CountryInputProps {
  /** ISO 3166-1 alpha-2 code. Legacy free-text values are accepted and resolved. */
  value: string
  /** Called with the alpha-2 code, or '' when cleared. */
  onChange: (value: string) => void
  className?: string
  id?: string
}

const MAX_VISIBLE = 8

export default function CountryInput({
  value,
  onChange,
  className = '',
  id,
}: CountryInputProps) {
  const { language } = useTranslation()
  const generatedId = useId()
  const listboxId = `${id ?? generatedId}-listbox`

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Rows written before country codes existed still resolve, so an existing
  // profile shows its country rather than an empty box.
  const selectedCode = useMemo(() => normalizeCountry(value), [value])
  const selectedLabel = selectedCode ? getCountryName(selectedCode, language) : ''

  const matches = useMemo(
    () => filterCountries(query, language).slice(0, MAX_VISIBLE),
    [query, language]
  )

  // While closed the field shows the selection; while open it shows what is typed.
  const displayValue = isOpen ? query : selectedLabel

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (activeIndex >= matches.length) setActiveIndex(0)
  }, [matches.length, activeIndex])

  useEffect(() => {
    if (isOpen) {
      optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex, isOpen])

  const open = () => {
    setIsOpen(true)
    setQuery('')
    setActiveIndex(0)
  }

  const commit = (country: Country) => {
    onChange(country.code)
    setQuery('')
    setIsOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!isOpen) return open()
        setActiveIndex((i) => (matches.length ? (i + 1) % matches.length : 0))
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!isOpen) return open()
        setActiveIndex((i) => (matches.length ? (i - 1 + matches.length) % matches.length : 0))
        break
      case 'Enter':
        if (isOpen && matches[activeIndex]) {
          event.preventDefault()
          commit(matches[activeIndex])
        }
        break
      case 'Escape':
        if (isOpen) {
          event.preventDefault()
          setIsOpen(false)
          setQuery('')
        }
        break
      case 'Tab':
        setIsOpen(false)
        setQuery('')
        break
    }
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          isOpen && matches[activeIndex] ? `${listboxId}-${matches[activeIndex].code}` : undefined
        }
        autoComplete="off"
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value)
          setActiveIndex(0)
          if (!isOpen) setIsOpen(true)
        }}
        onFocus={open}
        onKeyDown={handleKeyDown}
        className="w-full px-4 py-3 bg-white border border-beige-300 rounded-xl text-text-primary placeholder-text-light focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 transition-all"
        placeholder="Start typing a country name..."
      />

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 w-full mt-2 bg-white border border-beige-300 rounded-xl shadow-soft-xl max-h-60 overflow-y-auto py-1"
        >
          {matches.length === 0 && (
            <li className="px-4 py-3 text-text-tertiary text-sm">No countries found</li>
          )}

          {matches.map((country, index) => {
            const isSelected = country.code === selectedCode
            const isActive = index === activeIndex

            return (
              <li key={country.code} role="none">
                <button
                  ref={(el) => {
                    optionRefs.current[index] = el
                  }}
                  id={`${listboxId}-${country.code}`}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  // Keep focus on the input so the combobox keeps its keyboard model.
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(country)}
                  className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
                    isActive ? 'bg-beige-50' : ''
                  } ${isSelected ? 'text-gold-700 font-medium' : 'text-text-primary'}`}
                >
                  <span className="flex-1">{getCountryName(country.code, language)}</span>
                  <span className="text-xs text-text-tertiary font-mono">{country.code}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
