export class UnauthorizedError extends Error {
  constructor(reason?: string) {
    super(reason ?? 'Insufficient permissions')
    this.name = 'UnauthorizedError'
  }
}
