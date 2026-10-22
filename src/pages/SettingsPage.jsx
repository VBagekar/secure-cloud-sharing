import { useState } from 'react'
import { User, Key, LogOut, Info, Loader2 } from '../components/Icons'
import { isAuthConfigured } from '../config'
import { authService } from '../services/authService'
import { describeError } from '../errors'
import PasswordField from '../components/PasswordField'
import { useToast } from '../components/Toast'

const MIN_PASSWORD_LENGTH = 8

const SettingsPage = ({ user, onSignOut }) => {
  const { addToast } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [isChanging, setIsChanging] = useState(false)

  const handleChangePassword = async (event) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')
    if (!currentPassword) {
      setPasswordError('Please enter your current password.')
      return
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (newPassword === currentPassword) {
      setPasswordError('The new password must be different from your current password.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setIsChanging(true)
    try {
      await authService.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccess('Your password has been updated.')
      addToast('Password updated successfully.', 'success')
    } catch (err) {
      setPasswordError(describeError(err).message)
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <section className="page settings-page">
      <div className="page-header">
        <div>
          <h2>Settings</h2>
          <p className="page-subtitle">
            Account and integration configuration for this SecureVault deployment.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>
            <User size={16} /> Profile
          </h3>
        </div>
        <div className="profile-grid">
          <div className="profile-field">
            <span className="profile-label">Name</span>
            <span className="profile-value">{user?.name || '—'}</span>
          </div>
          <div className="profile-field">
            <span className="profile-label">Email</span>
            <span className="profile-value">{user?.email || '—'}</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>
            <Key size={16} /> Authentication
          </h3>
        </div>
        <p className="settings-line">
          Configured: <strong>{isAuthConfigured ? 'Yes' : 'No'}</strong>
        </p>
        <p className="settings-line">
          Status: <strong>Signed in</strong>
        </p>
        <div className="demo-callout">
          <Info size={16} />
          <span>
            Authentication uses Amazon Cognito. Tokens are issued by your Cognito user pool and
            sent as bearer tokens to the backend API — no credentials are hardcoded.
          </span>
        </div>
      </div>

      {isAuthConfigured && (
        <div className="panel">
          <div className="panel-header">
            <h3>
              <Key size={16} /> Change password
            </h3>
          </div>
          <p className="settings-line">
            Update the password for the signed-in Cognito account.
          </p>

          {passwordError && (
            <div className="error-message" role="alert">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="success-message" role="status">
              {passwordSuccess}
            </div>
          )}

          <form className="login-form" onSubmit={handleChangePassword} noValidate>
            <PasswordField
              inputId="settings-current-password"
              label="Current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
              placeholder="Enter your current password"
              disabled={isChanging}
            />

            <PasswordField
              inputId="settings-new-password"
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              placeholder="Enter a new password"
              hint={`At least ${MIN_PASSWORD_LENGTH} characters. Your user pool may require more.`}
              disabled={isChanging}
            />

            <PasswordField
              inputId="settings-confirm-password"
              label="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              placeholder="Re-enter the new password"
              disabled={isChanging}
            />

            <button
              type="submit"
              className="btn btn-primary settings-submit"
              disabled={isChanging}
              aria-busy={isChanging}
            >
              {isChanging ? (
                <>
                  <Loader2 size={16} /> Updating...
                </>
              ) : (
                <>
                  <Key size={16} /> Update password
                </>
              )}
            </button>
          </form>
        </div>
      )}

      <div className="panel danger-panel">
        <div className="panel-header">
          <h3>Session</h3>
        </div>
        <p className="settings-line">Sign out of the current session.</p>
        <button type="button" className="btn btn-danger" onClick={onSignOut}>
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </section>
  )
}

export default SettingsPage
