interface ErrorMapping {
  status: number
  title: string
}

export const domainErrorMapping: Record<string, ErrorMapping> = {
  InvalidCredentialsError: { status: 401, title: 'Invalid credentials' },
  AccountLockedError: { status: 423, title: 'Account temporarily locked' },
  UserAlreadyExistsError: { status: 409, title: 'Email already registered in this tenant' },
  WeakPasswordError: { status: 422, title: 'Password does not meet requirements' },
  InvalidEmailError: { status: 422, title: 'Invalid email format' },
  SessionNotFoundError: { status: 401, title: 'Session not found or expired' },
  UnauthorizedError: { status: 403, title: 'Insufficient permissions' },
  TenantNotFoundError: { status: 404, title: 'Tenant not found' },
  TenantSlugTakenError: { status: 409, title: 'Slug already taken' },
  PlanLimitExceededError: { status: 422, title: 'Plan limit exceeded' },
}
