export class TenantSlugTakenError extends Error {
  readonly status = 409
  constructor(slug: string) {
    super(`Slug "${slug}" is already taken`)
    this.name = 'TenantSlugTakenError'
  }
}
