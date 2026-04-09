import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

/**
 * Namespaces loaded per request.
 * Each entry maps to messages/<locale>/<namespace>.json.
 * Keys within each file are spread into the top-level messages object,
 * so components keep using useTranslations('login'), useTranslations('dashboard'), etc.
 * To add a new module, create the JSON files and add the namespace here.
 */
const NAMESPACES = ['common', 'auth', 'dashboard', 'leads', 'pipelines', 'settings', 'users'] as const

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  if (!locale || !(routing.locales as readonly string[]).includes(locale)) {
    locale = routing.defaultLocale
  }

  const modules = await Promise.all(
    NAMESPACES.map((ns) => import(`../../messages/${locale}/${ns}.json`)),
  )

  const messages = modules.reduce<Record<string, unknown>>(
    (acc, mod) => ({ ...acc, ...mod.default }),
    {},
  )

  return { locale, messages }
})
