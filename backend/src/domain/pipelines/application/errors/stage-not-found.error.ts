export class StageNotFoundError extends Error {
  constructor() {
    super('Stage not found')
    this.name = 'StageNotFoundError'
  }
}
