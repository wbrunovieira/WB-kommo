import type commonMessages from '../messages/pt/common.json'
import type authMessages from '../messages/pt/auth.json'
import type dashboardMessages from '../messages/pt/dashboard.json'
import type leadsMessages from '../messages/pt/leads.json'
import type pipelinesMessages from '../messages/pt/pipelines.json'
import type settingsMessages from '../messages/pt/settings.json'
import type usersMessages from '../messages/pt/users.json'

// Merges all namespace files into a single type, mirroring what request.ts does at runtime.
// PT is the source of truth — TypeScript will warn if a key used in code doesn't exist here.
type AppMessages = typeof commonMessages & typeof authMessages & typeof dashboardMessages & typeof leadsMessages & typeof pipelinesMessages & typeof settingsMessages & typeof usersMessages

declare module 'next-intl' {
  interface AppConfig {
    Messages: AppMessages
  }
}
