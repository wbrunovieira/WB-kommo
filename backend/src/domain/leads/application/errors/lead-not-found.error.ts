export class LeadNotFoundError extends Error {
  constructor() {
    super('Lead not found')
    this.name = 'LeadNotFoundError'
  }
}
