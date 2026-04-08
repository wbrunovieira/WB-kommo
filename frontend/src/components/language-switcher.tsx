'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

const LOCALE_LABELS: Record<string, string> = {
  pt: 'PT',
  en: 'EN',
  it: 'IT',
  es: 'ES',
}

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  function switchLocale(next: string) {
    router.replace(pathname, { locale: next })
  }

  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchLocale(loc)}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid',
            borderColor: locale === loc ? '#6c63ff' : '#2a2a45',
            backgroundColor: locale === loc ? 'rgba(108,99,255,0.15)' : 'transparent',
            color: locale === loc ? '#6c63ff' : '#8888aa',
            fontSize: '12px',
            fontWeight: 600,
            cursor: locale === loc ? 'default' : 'pointer',
            letterSpacing: '0.04em',
            transition: 'all 0.15s',
          }}
          disabled={locale === loc}
          aria-label={`Switch language to ${loc}`}
          aria-pressed={locale === loc}
        >
          {LOCALE_LABELS[loc]}
        </button>
      ))}
    </div>
  )
}
