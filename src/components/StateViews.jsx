import {
  Loader2,
  AlertTriangle,
  WifiOff,
  Lock,
  Shield,
  Plug,
  RefreshCw,
  Inbox,
} from './Icons'
import { describeError } from '../errors'

export const LoadingState = ({ label = 'Loading...' }) => (
  <div className="loading-state">
    <Loader2 size={28} className="state-spinner" />
    <p>{label}</p>
  </div>
)

export const EmptyState = ({ icon, title, message }) => {
  const IconComponent = icon || Inbox
  return (
    <div className="empty-state">
      <IconComponent size={44} className="empty-icon" />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
    </div>
  )
}

const KIND_ICONS = {
  notConfigured: Plug,
  unauthorized: Lock,
  forbidden: Shield,
  network: WifiOff,
  validation: AlertTriangle,
  notImplemented: Plug,
  error: AlertTriangle,
}

export const ErrorState = ({ error, onRetry, retryLabel = 'Retry' }) => {
  const info = describeError(error) || {
    kind: 'error',
    title: 'Something went wrong',
    message: 'An unexpected error occurred.',
  }
  const IconComponent = KIND_ICONS[info.kind] || AlertTriangle
  const canRetry = Boolean(onRetry) && info.kind !== 'notConfigured' && info.kind !== 'notImplemented'

  return (
    <div className={`error-state error-${info.kind}`}>
      <IconComponent size={40} className="error-state-icon" />
      <h3>{info.title}</h3>
      <p>{info.message}</p>
      {canRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          <RefreshCw size={16} /> {retryLabel}
        </button>
      )}
    </div>
  )
}
