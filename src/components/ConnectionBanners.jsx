import { Plug } from './Icons'
import { isBackendConfigured } from '../config'

export const BackendBanner = () => {
  if (isBackendConfigured) return null
  return (
    <div className="connection-banner connection-warning" role="status">
      <Plug size={16} />
      <span>
        Backend not connected. Data will appear when the service is configured. Set{' '}
        <code>VITE_API_BASE_URL</code> to enable API requests.
      </span>
    </div>
  )
}
