import { cognitoConfig, isAuthConfigured } from '../config'
import {
  AppError,
  ChallengeError,
  NetworkError,
  NotConfiguredError,
  UnauthorizedError,
  ValidationError,
} from '../errors'

const STORAGE_KEY = 'securevault.auth.session'
const REFRESH_LEEWAY_MS = 60 * 1000
const MIN_PASSWORD_LENGTH = 8

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

const idpRequest = async (target, body, context) => {
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
    throw mapCognitoError(data, response.status, context)
  }
  return data
}

const mapCognitoError = (data, status, context) => {
  const rawType = (data && (data.__type || data.code)) || ''
  const type = String(rawType).split('#').pop()
  const message = (data && data.message) || ''

  switch (type) {
    case 'NotAuthorizedException':
      if (context === 'changePassword') {
        if (/token/i.test(message)) {
          return new UnauthorizedError('Your session has expired. Please sign in again.')
        }
        return new ValidationError('Your current password is incorrect.')
      }
      if (context === 'signUp') {
        return new ValidationError(
          message || 'Self-service sign-up is not enabled for this user pool.',
        )
      }
      if (context === 'forgotPassword') {
        return new ValidationError(
          message ||
            'This account cannot reset its password. Check the email address or contact an administrator.',
        )
      }
      return new UnauthorizedError('Incorrect email or password.')
    case 'UserNotFoundException':
      if (context === 'forgotPassword') {
        return new ValidationError('No account was found for that email address.')
      }
      if (context === 'confirmSignUp' || context === 'resendConfirmationCode') {
        return new ValidationError('No pending sign-up was found for that email address.')
      }
      return new UnauthorizedError('Incorrect email or password.')
    case 'UsernameExistsException':
    case 'AliasExistsException': {
      const existsError = new ValidationError(
        'An account with this email already exists. Sign in or reset your password.',
      )
      existsError.code = 'USER_EXISTS'
      return existsError
    }
    case 'UserNotConfirmedException':
      return new ValidationError(
        'Your account is not confirmed yet. Enter the confirmation code we emailed you.',
      )
    case 'PasswordResetRequiredException':
      return new ValidationError('You must reset your password before signing in.')
    case 'InvalidPasswordException':
      return new ValidationError(message || 'The password does not meet the policy requirements.')
    case 'InvalidParameterException':
      return new ValidationError(message || 'The request was rejected. Check the submitted values.')
    case 'CodeDeliveryFailureException':
      return new AppError(
        message || 'Amazon Cognito could not send the code. Check the email address and try again.',
        'CODE_DELIVERY',
      )
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

const parseJsonObject = (raw) => {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const parseRequiredAttributes = (challengeParameters = {}) => {
  const raw = challengeParameters.requiredAttributes
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

const requireConfig = () => {
  if (!isAuthConfigured) {
    throw new NotConfiguredError(
      'Authentication is not configured. Cognito settings are required before continuing.',
    )
  }
}

const assertPassword = (password, label = 'Password') => {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`${label} must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  }
}

const assertEmail = (email) => {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('Please enter a valid email address.')
  }
}

let session = null
let refreshTimer = null
let sessionListener = null
let pendingChallenge = null

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
  pendingChallenge = null
  persist()
  notify()
}

const establishSession = (authenticationResult) => {
  pendingChallenge = null
  session = buildSession(authenticationResult)
  persist()
  scheduleRefresh()
  notify()
  return session
}

const challengeError = (challengeName) => {
  if (challengeName === 'NEW_PASSWORD_REQUIRED') {
    return new ValidationError('Your account requires you to set a new password.')
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
    requireConfig()

    const username = typeof email === 'string' ? email.trim() : email
    const data = await idpRequest(
      'InitiateAuth',
      {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: cognitoConfig.clientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      },
      'signIn',
    )

    if (!data) {
      throw new AppError('Amazon Cognito returned an empty response.', 'AUTH')
    }

    if (data.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      pendingChallenge = {
        username,
        challengeName: data.ChallengeName,
        session: data.Session,
        requiredAttributes: parseRequiredAttributes(data.ChallengeParameters),
        knownAttributes: parseJsonObject(data.ChallengeParameters && data.ChallengeParameters.userAttributes),
      }
      throw new ChallengeError(
        'Your account needs a new password before you can continue.',
        'NEW_PASSWORD_REQUIRED',
        {
          username,
          requiredAttributes: pendingChallenge.requiredAttributes,
          knownAttributes: pendingChallenge.knownAttributes,
        },
      )
    }

    if (data.ChallengeName) {
      throw challengeError(data.ChallengeName)
    }

    if (!data.AuthenticationResult || !data.AuthenticationResult.IdToken) {
      throw new AppError('Amazon Cognito did not return an authentication result.', 'AUTH')
    }

    return establishSession(data.AuthenticationResult)
  },

  async completeNewPasswordChallenge(newPassword, attributes = {}) {
    requireConfig()

    if (!pendingChallenge || pendingChallenge.challengeName !== 'NEW_PASSWORD_REQUIRED') {
      throw new AppError(
        'No password change challenge is in progress. Please sign in again.',
        'AUTH_CHALLENGE',
      )
    }

    assertPassword(newPassword, 'New password')

    const challengeResponses = {
      USERNAME: pendingChallenge.username,
      NEW_PASSWORD: newPassword,
    }

    Object.entries(attributes || {}).forEach(([name, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        challengeResponses[`userAttributes.${name}`] = String(value)
      }
    })

    const data = await idpRequest(
      'RespondToAuthChallenge',
      {
        ClientId: cognitoConfig.clientId,
        ChallengeName: 'NEW_PASSWORD_REQUIRED',
        Session: pendingChallenge.session,
        ChallengeResponses: challengeResponses,
      },
      'newPassword',
    )

    if (!data) {
      throw new AppError('Amazon Cognito returned an empty response.', 'AUTH')
    }

    if (data.ChallengeName) {
      throw challengeError(data.ChallengeName)
    }

    if (!data.AuthenticationResult || !data.AuthenticationResult.IdToken) {
      throw new AppError('Amazon Cognito did not return an authentication result.', 'AUTH')
    }

    return establishSession(data.AuthenticationResult)
  },

  async signUp(email, password) {
    requireConfig()
    assertEmail(typeof email === 'string' ? email.trim() : email)
    assertPassword(password)

    const username = email.trim()
    const data = await idpRequest(
      'SignUp',
      {
        ClientId: cognitoConfig.clientId,
        Username: username,
        Password: password,
        UserAttributes: [{ Name: 'email', Value: username }],
      },
      'signUp',
    )

    return {
      userConfirmed: Boolean(data && data.UserConfirmed),
      codeDeliveryDetails: (data && data.CodeDeliveryDetails) || null,
    }
  },

  async confirmSignUp(email, code) {
    requireConfig()
    const username = typeof email === 'string' ? email.trim() : email
    if (!code || !String(code).trim()) {
      throw new ValidationError('Please enter the confirmation code.')
    }

    await idpRequest(
      'ConfirmSignUp',
      {
        ClientId: cognitoConfig.clientId,
        Username: username,
        ConfirmationCode: String(code).trim(),
      },
      'confirmSignUp',
    )

    return true
  },

  async resendConfirmationCode(email) {
    requireConfig()
    const username = typeof email === 'string' ? email.trim() : email

    const data = await idpRequest(
      'ResendConfirmationCode',
      {
        ClientId: cognitoConfig.clientId,
        Username: username,
      },
      'resendConfirmationCode',
    )

    return (data && data.CodeDeliveryDetails) || null
  },

  async forgotPassword(email) {
    requireConfig()
    assertEmail(typeof email === 'string' ? email.trim() : email)

    const data = await idpRequest(
      'ForgotPassword',
      {
        ClientId: cognitoConfig.clientId,
        Username: email.trim(),
      },
      'forgotPassword',
    )

    return (data && data.CodeDeliveryDetails) || null
  },

  async confirmForgotPassword(email, code, newPassword) {
    requireConfig()
    const username = typeof email === 'string' ? email.trim() : email
    if (!code || !String(code).trim()) {
      throw new ValidationError('Please enter the reset code.')
    }
    assertPassword(newPassword, 'New password')

    await idpRequest(
      'ConfirmForgotPassword',
      {
        ClientId: cognitoConfig.clientId,
        Username: username,
        ConfirmationCode: String(code).trim(),
        Password: newPassword,
      },
      'confirmForgotPassword',
    )

    return true
  },

  async changePassword(previousPassword, newPassword) {
    requireConfig()

    if (!session || !session.accessToken) {
      throw new UnauthorizedError('Your session has expired. Please sign in again.')
    }
    if (!previousPassword) {
      throw new ValidationError('Please enter your current password.')
    }
    assertPassword(newPassword, 'New password')

    await idpRequest(
      'ChangePassword',
      {
        AccessToken: session.accessToken,
        PreviousPassword: previousPassword,
        ProposedPassword: newPassword,
      },
      'changePassword',
    )

    return true
  },

  async signOut() {
    resetSession()
    return undefined
  },
}
