export class PlanLimitExceededError extends Error {
  constructor() {
    super('Plan lead limit reached')
    this.name = 'PlanLimitExceededError'
  }
}
