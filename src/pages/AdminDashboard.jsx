import {
  Users,
  Shield,
  Activity as ActivityIcon,
  Info,
  FolderOpen,
  Share2,
} from '../components/Icons'
import { LoadingState, EmptyState, ErrorState } from '../components/StateViews'
import { api } from '../services/api'
import { useAsync } from '../hooks/useAsync'
import { describeError } from '../errors'

const settle = async (promise, fallback) => {
  try {
    return { value: await promise, error: null }
  } catch (error) {
    return { value: fallback, error }
  }
}

const SectionNotice = ({ error }) => {
  if (!error) return null
  const info = describeError(error)
  return (
    <p className="panel-note">
      <Info size={14} /> {info.title}: {info.message}
    </p>
  )
}

const AdminDashboard = () => {
  const { status, data, error, reload } = useAsync(async () => {
    const [members, stats, integrations, checklist] = await Promise.all([
      settle(api.listTeamMembers(), []),
      settle(api.getStats(), null),
      settle(api.getIntegrationStatus(), null),
      settle(api.getSecurityChecklist(), []),
    ])
    return { members, stats, integrations, checklist }
  }, [])

  if (status === 'loading') return <LoadingState label="Loading admin data..." />
  if (status === 'error') return <ErrorState error={error} onRetry={reload} />

  const { members, stats, integrations, checklist } = data
  const memberList = Array.isArray(members.value) ? members.value : []
  const statsData = stats.value || {}
  const integrationData = integrations.value || {}
  const checkList = Array.isArray(checklist.value) ? checklist.value : []
  const hasIntegrations = Object.keys(integrationData).length > 0

  return (
    <section className="page admin-dashboard">
      <div className="page-header">
        <div>
          <h2>Admin</h2>
          <p className="page-subtitle">
            Team and integration information provided by the backend.
          </p>
        </div>
      </div>

      <div className="stats-grid admin-stats">
        <div className="stat-card static">
          <span className="stat-card-icon">
            <FolderOpen size={20} />
          </span>
          <span className="stat-value">{statsData.totalFiles ?? '—'}</span>
          <span className="stat-label">Total files</span>
        </div>
        <div className="stat-card static">
          <span className="stat-card-icon">
            <Share2 size={20} />
          </span>
          <span className="stat-value">{statsData.sharedFiles ?? '—'}</span>
          <span className="stat-label">Shared files</span>
        </div>
        <div className="stat-card static">
          <span className="stat-card-icon">
            <Users size={20} />
          </span>
          <span className="stat-value">{memberList.length}</span>
          <span className="stat-label">Team members</span>
        </div>
        <div className="stat-card static">
          <span className="stat-card-icon">
            <ActivityIcon size={20} />
          </span>
          <span className="stat-value">{statsData.activeUsers ?? '—'}</span>
          <span className="stat-label">Active users</span>
        </div>
      </div>

      <SectionNotice error={stats.error} />

      <div className="panel">
        <div className="panel-header">
          <h3>AWS integration status</h3>
        </div>
        <SectionNotice error={integrations.error} />
        {hasIntegrations ? (
          <div className="status-grid">
            {Object.entries(integrationData).map(([key, value]) => (
              <div key={key} className="status-item">
                <span className="status-item-icon">
                  <Shield size={18} />
                </span>
                <div className="status-item-body">
                  <strong>{key}</strong>
                  <span className="status-item-note">{String(value)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !integrations.error && (
            <EmptyState
              icon={Shield}
              title="No integration status"
              message="The backend did not return integration status."
            />
          )
        )}
      </div>

      <div className="admin-columns">
        <div className="panel">
          <div className="panel-header">
            <h3>
              <Shield size={16} /> Security checklist
            </h3>
          </div>
          <SectionNotice error={checklist.error} />
          {checkList.length > 0 ? (
            <ul className="checklist">
              {checkList.map((item, idx) => (
                <li key={idx} className={item.done ? 'done' : 'pending'}>
                  {item.done ? (
                    <Info size={16} />
                  ) : (
                    <span style={{ width: 16, display: 'inline-block' }} />
                  )}
                  <span>{item.label || String(item)}</span>
                </li>
              ))}
            </ul>
          ) : (
            !checklist.error && (
              <EmptyState
                icon={Shield}
                title="No security checklist"
                message="Security controls will be listed when reported by the backend."
              />
            )
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>
              <Users size={16} /> Team members
            </h3>
          </div>
          <SectionNotice error={members.error} />
          {memberList.length > 0 ? (
            <ul className="member-list">
              {memberList.map((member) => (
                <li key={member.id || member.email} className="member-item">
                  <span className="user-avatar">
                    {member.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                  <div className="member-info">
                    <span className="member-name">{member.name || member.email}</span>
                    {member.email && <span className="member-email">{member.email}</span>}
                  </div>
                  <span className="pill">{member.role || 'Member'}</span>
                </li>
              ))}
            </ul>
          ) : (
            !members.error && (
              <EmptyState
                icon={Users}
                title="No team members"
                message="Team membership will appear when the backend supplies it."
              />
            )
          )}
        </div>
      </div>
    </section>
  )
}

export default AdminDashboard
