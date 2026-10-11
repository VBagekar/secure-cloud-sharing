import { FolderOpen, Share2, HardDrive, Info, ArrowUpDown } from '../components/Icons'
import { LoadingState, EmptyState, ErrorState } from '../components/StateViews'
import { api } from '../services/api'
import { useAsync } from '../hooks/useAsync'
import { formatBytes, formatDate } from '../utils/format'

const METRIC_FIELDS = {
  totalFiles: (stats) => stats.totalFiles,
  sharedFiles: (stats) => stats.sharedFiles,
}

const OverviewDashboard = ({ onNavigate }) => {
  const { status, data, error, reload } = useAsync(async () => {
    const [stats, activity] = await Promise.all([api.getStats(), api.listActivity()])
    return { stats: stats || {}, activity }
  }, [])

  if (status === 'loading') {
    return <LoadingState label="Loading overview..." />
  }

  if (status === 'error') {
    return <ErrorState error={error} onRetry={reload} />
  }

  const { stats, activity } = data
  const cards = [
    {
      label: 'Total files',
      value: METRIC_FIELDS.totalFiles(stats) ?? '—',
      icon: FolderOpen,
      key: 'my-files',
    },
    {
      label: 'Shared files',
      value: METRIC_FIELDS.sharedFiles(stats) ?? '—',
      icon: Share2,
      key: 'shared-with-me',
    },
    {
      label: 'Storage used',
      value:
        stats.storageUsedBytes !== undefined ? formatBytes(stats.storageUsedBytes) : '—',
      icon: HardDrive,
      key: null,
    },
  ]

  const hasQuota = stats.storageQuotaBytes !== undefined

  return (
    <section className="overview-page page">
      <div className="page-header">
        <div>
          <h2>Overview</h2>
          <p className="page-subtitle">Summary of your secure workspace, served by the backend.</p>
        </div>
      </div>

      <div className="stats-grid">
        {cards.map((card) => {
          const IconComponent = card.icon
          const interactive = Boolean(card.key)
          return (
            <button
              key={card.label}
              type="button"
              className={`stat-card ${interactive ? 'clickable' : ''}`}
              onClick={interactive ? () => onNavigate(card.key) : undefined}
              disabled={!interactive}
            >
              <span className="stat-card-icon">
                <IconComponent size={20} />
              </span>
              <span className="stat-value">{card.value}</span>
              <span className="stat-label">{card.label}</span>
            </button>
          )
        })}
      </div>

      {hasQuota && (
        <p className="panel-note">
          <HardDrive size={14} /> Quota: {formatBytes(stats.storageQuotaBytes)} total (reported by
          the backend).
        </p>
      )}

      <div className="panel">
        <div className="panel-header">
          <h3>Recent activity</h3>
          <button type="button" className="link-btn" onClick={() => onNavigate('activity')}>
            View all
          </button>
        </div>
        {activity.length === 0 ? (
          <EmptyState
            icon={ArrowUpDown}
            title="No activity recorded"
            message="Activity will appear here once the backend reports it."
          />
        ) : (
          <div className="activity-list">
            {activity.slice(0, 5).map((event) => (
              <div key={event.id} className="activity-item">
                <span className={`activity-badge activity-${event.type || 'default'}`}>
                  {event.type || 'event'}
                </span>
                <span className="activity-text">
                  <strong>{event.actor || 'Unknown actor'}</strong>{' '}
                  <span className="activity-filename">{event.filename || event.fileName}</span>
                </span>
                <span className="activity-time">{formatDate(event.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel quick-actions-panel">
        <div className="panel-header">
          <h3>Quick actions</h3>
        </div>
        <div className="quick-actions">
          <button type="button" className="btn btn-primary" onClick={() => onNavigate('my-files')}>
            <FolderOpen size={16} /> Manage files
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigate('shared-with-me')}
          >
            <Share2 size={16} /> Shared with me
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigate('activity')}
          >
            <Info size={16} /> View activity
          </button>
        </div>
      </div>
    </section>
  )
}

export default OverviewDashboard
