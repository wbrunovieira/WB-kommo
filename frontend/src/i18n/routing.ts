import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['pt', 'en', 'it', 'es'],
  defaultLocale: 'pt',
})
