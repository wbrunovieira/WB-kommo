export class UserAlreadyExistsError extends Error {
  constructor() {
    super('A user with this email already exists in this tenant')
    this.name = 'UserAlreadyExistsError'
  }
}
