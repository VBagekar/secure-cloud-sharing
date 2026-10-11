export class AppError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'AppError'
    this.code = code
  }
}

export class NotConfiguredError extends AppError {
  constructor(message) {
    super(
      message || 'Backend not connected. Data will appear when the service is configured.',
      'NOT_CONFIGURED',
    )
    this.name = 'NotConfiguredError'
  }
}

export class NotImplementedError extends AppError {
  constructor(message) {
    super(
      message || 'This backend endpoint is not available yet.',
      'NOT_IMPLEMENTED',
    )
    this.name = 'NotImplementedError'
  }
}

export class NetworkError extends AppError {
  constructor(message) {
    super(
      message || 'Unable to reach the backend API. Check your connection and try again.',
      'NETWORK',
    )
    this.name = 'NetworkError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message) {
    super(message || 'You are not signed in, or your session has expired.', 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message) {
    super(message || 'You do not have permission to perform this action.', 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message || 'The request was rejected. Please check the submitted values.', 'VALIDATION')
    this.name = 'ValidationError'
  }
}

export class ApiError extends AppError {
  constructor(message, status, details) {
    super(message || `Request failed with status ${status}.`, 'API')
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export const describeError = (error) => {
  if (!error) return null
  if (error instanceof NotConfiguredError) {
    return {
      kind: 'notConfigured',
      title: 'Backend not connected',
      message: error.message,
    }
  }
  if (error instanceof UnauthorizedError) {
    return { kind: 'unauthorized', title: 'Not authorized', message: error.message }
  }
  if (error instanceof ForbiddenError) {
    return { kind: 'forbidden', title: 'Access denied', message: error.message }
  }
  if (error instanceof NetworkError) {
    return { kind: 'network', title: 'Network error', message: error.message }
  }
  if (error instanceof ValidationError) {
    return { kind: 'validation', title: 'Invalid request', message: error.message }
  }
  if (error instanceof NotImplementedError) {
    return {
      kind: 'notImplemented',
      title: 'Backend integration pending',
      message: error.message,
    }
  }
  return {
    kind: 'error',
    title: 'Something went wrong',
    message: error.message || 'An unexpected error occurred.',
  }
}
