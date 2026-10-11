import { Activity as ActivityIcon } from '../components/Icons'
import { LoadingState, EmptyState, ErrorState } from '../components/StateViews'
import { api } from '../services/api'
import { useAsync } from '../hooks/useAsync'
import { formatDateTime } from '../utils/format'

const ActivityPage = () => {
  const { status, data, error, reload } = useAsync(async () => {
    const activities = await api.listActivity()
    return activities || []
  }, [])

  const activities = Array.isArray(data) ? data : []

  if (status === 'loading') return <LoadingState label="Loading activity..." />
  if (status === 'error') return <ErrorState error={error} onRetry={reload} />

  return (
    <section className="page activity-page">
      <div className="page-header">
        <div>
          <h2>Activity</h2>
          <p className="page-subtitle">
            Real activity records returned by the backend. Browser actions are not shown.
          </p>
        </div>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title="No activity recorded"
          message="No activity was returned by the backend."
        />
      ) : (
        <ol className="timeline">
          {activities.map((activity) => (
            <li key={activity.id} className="timeline-item">
              <span className={`timeline-dot dot-${activity.type || 'default'}`} />
              <div className="timeline-content">
                <div className="timeline-top">
                  <span className="timeline-filename">
                    {activity.filename || activity.fileName || activity.action || 'Activity'}
                  </span>
                  <span className={`activity-badge activity-${activity.type || 'default'}`}>
                    {activity.type || 'event'}
                  </span>
                </div>
                <div className="timeline-meta">
                  <span>Actor: {activity.actor || activity.user || activity.email || '—'}</span>
                  <span>{formatDateTime(activity.timestamp || activity.createdAt)}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export default ActivityPage
