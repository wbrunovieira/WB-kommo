export class TenantNotFoundError extends Error {
  constructor(slug: string) {
    super(`Workspace "${slug}" not found`)
    this.name = 'TenantNotFoundError'
  }
}
