import { User, Key, HardDrive, LogOut, Info } from '../components/Icons'
import { isAuthConfigured } from '../config'

const SettingsPage = ({ user, onSignOut }) => {
  const integrationRows = [
    'Cognito',
    'S3',
    'DynamoDB',
    'API Gateway',
    'Lambda',
    'SNS',
    'CloudWatch',
    'CloudTrail',
  ]

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

      <div className="panel">
        <div className="panel-header">
          <h3>
            <HardDrive size={16} /> Integration status (expected)
          </h3>
        </div>
        <div className="status-list">
          {integrationRows.map((row) => (
            <div key={row} className="status-row">
              <span>{row}</span>
              <span className="status-badge status-pending">Pending</span>
            </div>
          ))}
        </div>
        <p className="help-text">
          Actual status is shown on the Admin page when returned by the backend.
        </p>
      </div>

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
