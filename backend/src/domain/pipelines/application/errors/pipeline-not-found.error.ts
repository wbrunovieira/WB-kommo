export class PipelineNotFoundError extends Error {
  constructor() {
    super('Pipeline not found')
    this.name = 'PipelineNotFoundError'
  }
}
