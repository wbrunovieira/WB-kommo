import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['pt', 'en', 'it', 'es'],
  defaultLocale: 'pt',

  // Detects browser language on first visit (Accept-Language header)
  localeDetection: true,

  // Persists chosen locale in a cookie for 1 year
  localeCookie: {
    name: 'wb_locale',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  },
})
