import { cognitoConfig, isAuthConfigured } from '../config'
import {
  AppError,
  NetworkError,
  NotConfiguredError,
  UnauthorizedError,
  ValidationError,
} from '../errors'

const STORAGE_KEY = 'securevault.auth.session'
const REFRESH_LEEWAY_MS = 60 * 1000

const readStorage = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const writeStorage = (session) => {
  if (typeof window === 'undefined') return
  try {
    if (session) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Storage can be unavailable (private mode); tokens stay in memory only.
  }
}

const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

const decodeJwt = (token) => {
  try {
    const [, payload] = token.split('.')
    return JSON.parse(decodeBase64Url(payload))
  } catch {
    return null
  }
}

const userFromIdToken = (idToken) => {
  const claims = decodeJwt(idToken) || {}
  const email = claims.email || ''
  const name = claims.name || claims.given_name || claims.preferred_username || email
  return {
    id: claims.sub || '',
    name: name || 'Signed in user',
    email,
  }
}

const endpoint = () => `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/`

const idpRequest = async (target, body) => {
  let response
  try {
    response = await fetch(endpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new NetworkError('Unable to reach Amazon Cognito. Check your connection and try again.')
  }

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    throw mapCognitoError(data, response.status)
  }
  return data
}

const mapCognitoError = (data, status) => {
  const rawType = (data && (data.__type || data.code)) || ''
  const type = String(rawType).split('#').pop()
  const message = (data && data.message) || ''

  switch (type) {
    case 'NotAuthorizedException':
    case 'UserNotFoundException':
      return new UnauthorizedError('Incorrect email or password.')
    case 'UserNotConfirmedException':
      return new ValidationError(
        'Your account is not confirmed yet. Check your email for the confirmation code.',
      )
    case 'PasswordResetRequiredException':
      return new ValidationError('You must reset your password before signing in.')
    case 'InvalidPasswordException':
      return new ValidationError(message || 'The password does not meet the policy requirements.')
    case 'InvalidParameterException':
      return new ValidationError(message || 'The sign-in request was rejected.')
    case 'TooManyRequestsException':
    case 'LimitExceededException':
      return new AppError('Too many attempts. Please wait a moment and try again.', 'RATE_LIMIT')
    case 'CodeMismatchException':
    case 'ExpiredCodeException':
      return new ValidationError(message || 'The verification code is invalid or has expired.')
    default:
      return new AppError(message || `Authentication failed (status ${status}).`, 'AUTH')
  }
}

let session = null
let refreshTimer = null
let sessionListener = null

const notify = () => {
  if (typeof sessionListener === 'function') {
    sessionListener(session)
  }
}

const clearRefreshTimer = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
}

const persist = () => {
  writeStorage(session)
}

const scheduleRefresh = () => {
  clearRefreshTimer()
  if (!session || !session.refreshToken) return

  const delay = session.expiresAt - Date.now() - REFRESH_LEEWAY_MS
  const wait = Math.max(delay, 0)
  refreshTimer = setTimeout(() => {
    refresh().catch(() => {
      // refresh() clears the session and notifies listeners on failure.
    })
  }, wait)
}

const buildSession = (authResult) => {
  const idToken = authResult.IdToken
  const accessToken = authResult.AccessToken
  const refreshToken = authResult.RefreshToken || (session && session.refreshToken) || null
  const expiresIn = Number(authResult.ExpiresIn) || 3600
  return {
    idToken,
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    user: userFromIdToken(idToken),
  }
}

const refresh = async () => {
  if (!session || !session.refreshToken) {
    resetSession()
    return null
  }

  const data = await idpRequest('InitiateAuth', {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: cognitoConfig.clientId,
    AuthParameters: { REFRESH_TOKEN: session.refreshToken },
  })

  if (!data || !data.AuthenticationResult) {
    resetSession()
    return null
  }

  session = buildSession(data.AuthenticationResult)
  persist()
  scheduleRefresh()
  notify()
  return session
}

const resetSession = () => {
  clearRefreshTimer()
  session = null
  persist()
  notify()
}

const challengeError = (challengeName) => {
  if (challengeName === 'NEW_PASSWORD_REQUIRED') {
    return new ValidationError(
      'Your account requires a new password. Set it in Amazon Cognito, then sign in again.',
    )
  }
  if (challengeName === 'SMS_MFA' || challengeName === 'SOFTWARE_TOKEN_MFA') {
    return new ValidationError(
      'This account requires multi-factor authentication, which is not enabled in the frontend yet.',
    )
  }
  return new AppError(`Unsupported sign-in challenge: ${challengeName}.`, 'AUTH_CHALLENGE')
}

export const authService = {
  get isConfigured() {
    return isAuthConfigured
  },

  getConfig() {
    return { ...cognitoConfig }
  },

  setSessionListener(listener) {
    sessionListener = typeof listener === 'function' ? listener : null
  },

  getIdToken() {
    return session ? session.idToken : null
  },

  getUser() {
    return session ? session.user : null
  },

  getSession() {
    return session
  },

  async restore() {
    if (!isAuthConfigured) return null
    if (session) return session

    const stored = readStorage()
    if (!stored || !stored.idToken) return null

    session = stored
    if (!session.expiresAt || session.expiresAt - Date.now() <= REFRESH_LEEWAY_MS) {
      try {
        const refreshed = await refresh()
        if (refreshed) return refreshed
        return null
      } catch {
        resetSession()
        return null
      }
    }

    scheduleRefresh()
    notify()
    return session
  },

  async getCurrentSession() {
    return this.restore()
  },

  async signIn(email, password) {
    if (!isAuthConfigured) {
      throw new NotConfiguredError(
        'Authentication is not configured. Cognito settings are required before signing in.',
      )
    }

    const data = await idpRequest('InitiateAuth', {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: cognitoConfig.clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    })

    if (!data) {
      throw new AppError('Amazon Cognito returned an empty response.', 'AUTH')
    }

    if (data.ChallengeName) {
      throw challengeError(data.ChallengeName)
    }

    if (!data.AuthenticationResult || !data.AuthenticationResult.IdToken) {
      throw new AppError('Amazon Cognito did not return an authentication result.', 'AUTH')
    }

    session = buildSession(data.AuthenticationResult)
    persist()
    scheduleRefresh()
    notify()
    return session
  },

  async signOut() {
    resetSession()
    return undefined
  },
}
