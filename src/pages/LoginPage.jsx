import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Loader2, Shield, Lock, ServerOff } from '../components/Icons'
import { describeError } from '../errors'

const LoginPage = () => {
  const { signIn, isAuthConfigured, isSigningIn, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLocalError('')
    if (!email.trim()) {
      setLocalError('Please enter your email address.')
      return
    }
    if (!password) {
      setLocalError('Please enter your password.')
      return
    }
    try {
      await signIn(email.trim(), password)
    } catch {
      // Error state is surfaced from the auth context below.
    }
  }

  const authError = localError || (error ? describeError(error).message : '')

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
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {authError && (
              <div className="error-message" role="alert">
                {authError}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <div className="password-field">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={isSigningIn}>
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
          </form>
        )}
      </div>
    </div>
  )
}

export default LoginPage
