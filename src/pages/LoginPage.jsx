import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services/authService'
import { ChallengeError, describeError } from '../errors'
import PasswordField from '../components/PasswordField'
import {
  ArrowLeft,
  CheckCircle,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ServerOff,
  Shield,
  UserPlus,
} from '../components/Icons'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

const isValidEmail = (value) => EMAIL_PATTERN.test(String(value || '').trim())

const ATTRIBUTE_LABELS = {
  name: 'Full name',
  given_name: 'First name',
  family_name: 'Last name',
  middle_name: 'Middle name',
  nickname: 'Nickname',
  preferred_username: 'Preferred username',
  email: 'Email',
  phone_number: 'Phone number',
  birthdate: 'Birthdate (YYYY-MM-DD)',
  address: 'Address',
  locale: 'Locale',
}

const attributeLabel = (name) =>
  ATTRIBUTE_LABELS[name] || String(name).replace(/^custom:/, '').replace(/[_-]+/g, ' ')

const attributeInputType = (name) => {
  if (name === 'email' || name === 'preferred_username') return 'email'
  if (name === 'phone_number') return 'tel'
  return 'text'
}

const Feedback = ({ error, success }) => (
  <>
    {error && (
      <div className="error-message" role="alert">
        {error}
      </div>
    )}
    {success && (
      <div className="success-message" role="status">
        {success}
      </div>
    )}
  </>
)

const BackToSignIn = ({ onClick, label = 'Back to sign in' }) => (
  <div className="auth-back">
    <button type="button" className="link-btn" onClick={onClick}>
      <ArrowLeft size={14} /> {label}
    </button>
  </div>
)

const SignInForm = ({ notice, onForgot, onSignUp, onChallenge }) => {
  const { signIn, isSigningIn, error, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLocalError('')
    clearError()
    if (!isValidEmail(email)) {
      setLocalError('Please enter a valid email address.')
      return
    }
    if (!password) {
      setLocalError('Please enter your password.')
      return
    }
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      if (err instanceof ChallengeError && err.challenge === 'NEW_PASSWORD_REQUIRED') {
        onChallenge({
          username: email.trim(),
          requiredAttributes: err.details.requiredAttributes || [],
          knownAttributes: err.details.knownAttributes || {},
        })
      }
      // Other errors are surfaced from the auth context.
    }
  }

  const authError =
    localError || (error && !(error instanceof ChallengeError) ? describeError(error).message : '')

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <Feedback error={authError} success={notice} />

      <div className="form-group">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <PasswordField
        inputId="login-password"
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        placeholder="Enter your password"
      />

      <button type="submit" className="btn btn-primary btn-block" disabled={isSigningIn} aria-busy={isSigningIn}>
        {isSigningIn ? (
          <>
            <Loader2 size={16} /> Signing in...
          </>
        ) : (
          <>
            <Lock size={16} /> Sign in
          </>
        )}
      </button>

      <div className="auth-links">
        <button type="button" className="link-btn" onClick={onForgot}>
          Forgot password?
        </button>
        <button type="button" className="link-btn" onClick={onSignUp}>
          Create account
        </button>
      </div>
    </form>
  )
}

const SignUpForm = ({ onBack, onConfirm, onSignIn }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [userExists, setUserExists] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setUserExists(false)
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const result = await authService.signUp(email.trim(), password)
      if (result.userConfirmed) {
        onSignIn({ email: email.trim(), message: 'Your account is ready. Sign in to continue.' })
      } else {
        onConfirm({
          email: email.trim(),
          message: `We emailed a confirmation code to ${email.trim()}.`,
        })
      }
    } catch (err) {
      setError(describeError(err).message)
      if (err && err.code === 'USER_EXISTS') setUserExists(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <h2 className="auth-heading">Create your account</h2>
      <p className="auth-help">Sign up with your email. We will send a code to verify it.</p>

      <Feedback error={error} />

      <div className="form-group">
        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <PasswordField
        inputId="signup-password"
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        placeholder="Create a password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters. Your user pool may require more.`}
      />

      <PasswordField
        inputId="signup-confirm"
        label="Confirm password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        placeholder="Re-enter your password"
      />

      <button type="submit" className="btn btn-primary btn-block" disabled={submitting} aria-busy={submitting}>
        {submitting ? (
          <>
            <Loader2 size={16} /> Creating account...
          </>
        ) : (
          <>
            <UserPlus size={16} /> Create account
          </>
        )}
      </button>

      {userExists && (
        <div className="auth-links">
          <button
            type="button"
            className="link-btn"
            onClick={() => onConfirm({ email: email.trim() })}
          >
            Enter confirmation code
          </button>
          <button type="button" className="link-btn" onClick={() => onSignIn({ email: email.trim() })}>
            Sign in
          </button>
        </div>
      )}

      <BackToSignIn onClick={onBack} />
    </form>
  )
}

const ConfirmSignUpForm = ({ initialEmail, notice, onSignIn, onBack }) => {
  const [email, setEmail] = useState(initialEmail || '')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(notice || '')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!code.trim()) {
      setError('Please enter the confirmation code.')
      return
    }
    setSubmitting(true)
    try {
      await authService.confirmSignUp(email.trim(), code)
      onSignIn({ email: email.trim(), message: 'Email confirmed. Sign in to continue.' })
    } catch (err) {
      setError(describeError(err).message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setSuccess('')
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    setResending(true)
    try {
      await authService.resendConfirmationCode(email.trim())
      setSuccess('A new confirmation code has been sent to your email.')
    } catch (err) {
      setError(describeError(err).message)
    } finally {
      setResending(false)
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <h2 className="auth-heading">Confirm your email</h2>
      <p className="auth-help">Enter the verification code we sent to your email address.</p>

      <Feedback error={error} success={success} />

      <div className="form-group">
        <label htmlFor="confirm-email">Email</label>
        <input
          id="confirm-email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="confirm-code">Confirmation code</label>
        <input
          id="confirm-code"
          className="code-input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </div>

      <button type="submit" className="btn btn-primary btn-block" disabled={submitting} aria-busy={submitting}>
        {submitting ? (
          <>
            <Loader2 size={16} /> Verifying...
          </>
        ) : (
          <>
            <CheckCircle size={16} /> Verify email
          </>
        )}
      </button>

      <button
        type="button"
        className="btn btn-secondary btn-block auth-secondary-btn"
        onClick={handleResend}
        disabled={resending}
        aria-busy={resending}
      >
        {resending ? (
          <>
            <Loader2 size={16} /> Sending...
          </>
        ) : (
          <>
            <RefreshCw size={16} /> Resend code
          </>
        )}
      </button>

      <BackToSignIn onClick={onBack} />
    </form>
  )
}

const ForgotPasswordForm = ({ onBack, onReset }) => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    setSubmitting(true)
    try {
      await authService.forgotPassword(email.trim())
      onReset({
        email: email.trim(),
        message:
          'If an account exists for that email, a password reset code has been sent. Check your inbox.',
      })
    } catch (err) {
      setError(describeError(err).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <h2 className="auth-heading">Reset your password</h2>
      <p className="auth-help">Enter your account email and we will send a reset code.</p>

      <Feedback error={error} />

      <div className="form-group">
        <label htmlFor="forgot-email">Email</label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <button type="submit" className="btn btn-primary btn-block" disabled={submitting} aria-busy={submitting}>
        {submitting ? (
          <>
            <Loader2 size={16} /> Sending code...
          </>
        ) : (
          <>
            <Mail size={16} /> Send reset code
          </>
        )}
      </button>

      <BackToSignIn onClick={onBack} />
    </form>
  )
}

const ResetPasswordForm = ({ initialEmail, notice, onSignIn, onBack }) => {
  const [email, setEmail] = useState(initialEmail || '')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success] = useState(notice || '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!code.trim()) {
      setError('Please enter the reset code.')
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await authService.confirmForgotPassword(email.trim(), code, password)
      onSignIn({ email: email.trim(), message: 'Your password has been reset. Sign in to continue.' })
    } catch (err) {
      setError(describeError(err).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <h2 className="auth-heading">Choose a new password</h2>
      <p className="auth-help">Enter the reset code we emailed you and pick a new password.</p>

      <Feedback error={error} success={success} />

      <div className="form-group">
        <label htmlFor="reset-email">Email</label>
        <input
          id="reset-email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="reset-code">Reset code</label>
        <input
          id="reset-code"
          className="code-input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </div>

      <PasswordField
        inputId="reset-password"
        label="New password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        placeholder="Enter a new password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
      />

      <PasswordField
        inputId="reset-confirm"
        label="Confirm new password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        placeholder="Re-enter the new password"
      />

      <button type="submit" className="btn btn-primary btn-block" disabled={submitting} aria-busy={submitting}>
        {submitting ? (
          <>
            <Loader2 size={16} /> Resetting...
          </>
        ) : (
          <>
            <KeyRound size={16} /> Reset password
          </>
        )}
      </button>

      <BackToSignIn onClick={onBack} />
    </form>
  )
}

const NewPasswordForm = ({ challenge, onBack }) => {
  const { completeNewPassword, isSigningIn } = useAuth()
  const requiredAttributes = (challenge && challenge.requiredAttributes) || []
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [attributes, setAttributes] = useState(() => {
    const initial = {}
    requiredAttributes.forEach((name) => {
      initial[name] = (challenge && challenge.knownAttributes && challenge.knownAttributes[name]) || ''
    })
    return initial
  })
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    const missing = requiredAttributes.find((name) => !String(attributes[name] || '').trim())
    if (missing) {
      setError(`Please provide a value for ${attributeLabel(missing)}.`)
      return
    }
    try {
      await completeNewPassword(password, attributes)
    } catch (err) {
      setError(describeError(err).message)
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <h2 className="auth-heading">Set a new password</h2>
      <p className="auth-help">
        Your account requires a new password before you can sign in for the first time.
      </p>

      <Feedback error={error} />

      <PasswordField
        inputId="new-password"
        label="New password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        placeholder="Enter a new password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
      />

      <PasswordField
        inputId="new-password-confirm"
        label="Confirm new password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        placeholder="Re-enter the new password"
      />

      {requiredAttributes.map((name) => (
        <div className="form-group" key={name}>
          <label htmlFor={`attr-${name}`}>{attributeLabel(name)}</label>
          <input
            id={`attr-${name}`}
            type={attributeInputType(name)}
            value={attributes[name] || ''}
            placeholder={attributeLabel(name)}
            onChange={(event) =>
              setAttributes((current) => ({ ...current, [name]: event.target.value }))
            }
          />
        </div>
      ))}

      <button type="submit" className="btn btn-primary btn-block" disabled={isSigningIn} aria-busy={isSigningIn}>
        {isSigningIn ? (
          <>
            <Loader2 size={16} /> Setting password...
          </>
        ) : (
          <>
            <KeyRound size={16} /> Set password &amp; sign in
          </>
        )}
      </button>

      <BackToSignIn onClick={onBack} label="Cancel" />
    </form>
  )
}

const LoginPage = () => {
  const { isAuthConfigured } = useAuth()
  const [mode, setMode] = useState('signin')
  const [flow, setFlow] = useState({})

  const go = (nextMode, payload = {}) => {
    setFlow(payload)
    setMode(nextMode)
  }

  const renderForm = () => {
    switch (mode) {
      case 'signup':
        return (
          <SignUpForm
            onBack={() => go('signin')}
            onConfirm={(payload) => go('confirm', payload)}
            onSignIn={(payload) => go('signin', payload)}
          />
        )
      case 'confirm':
        return (
          <ConfirmSignUpForm
            initialEmail={flow.email}
            notice={flow.message}
            onSignIn={(payload) => go('signin', payload)}
            onBack={() => go('signin')}
          />
        )
      case 'forgot':
        return (
          <ForgotPasswordForm
            onBack={() => go('signin')}
            onReset={(payload) => go('reset', payload)}
          />
        )
      case 'reset':
        return (
          <ResetPasswordForm
            initialEmail={flow.email}
            notice={flow.message}
            onSignIn={(payload) => go('signin', payload)}
            onBack={() => go('signin')}
          />
        )
      case 'new-password':
        return <NewPasswordForm challenge={flow.challenge} onBack={() => go('signin')} />
      case 'signin':
      default:
        return (
          <SignInForm
            notice={flow.message}
            onForgot={() => go('forgot')}
            onSignUp={() => go('signup')}
            onChallenge={(challenge) => go('new-password', { challenge })}
          />
        )
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            <Shield size={28} />
          </div>
          <div>
            <h1>SecureVault</h1>
            <p>Secure Cloud File Sharing Platform</p>
          </div>
        </div>

        {!isAuthConfigured ? (
          <div className="login-unconfigured">
            <div className="login-unconfigured-heading">
              <ServerOff size={20} />
              <span>Authentication not configured</span>
            </div>
            <p>
              Amazon Cognito settings are not available, so sign-in is disabled. Provide the
              Cognito configuration to enable authentication.
            </p>
            <ul className="env-list">
              <li>
                <code>VITE_AWS_REGION</code>
              </li>
              <li>
                <code>VITE_COGNITO_USER_POOL_ID</code>
              </li>
              <li>
                <code>VITE_COGNITO_CLIENT_ID</code>
              </li>
            </ul>
          </div>
        ) : (
          renderForm()
        )}
      </div>
    </div>
  )
}

export default LoginPage
