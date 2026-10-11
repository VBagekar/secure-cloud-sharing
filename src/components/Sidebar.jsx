import {
  LayoutDashboard,
  FolderOpen,
  Share2,
  Clock,
  Shield,
  Settings,
  X,
  User,
} from './Icons'
import { NAV_ITEMS } from '../navigation'

const ICONS = {
  overview: LayoutDashboard,
  'my-files': FolderOpen,
  'shared-with-me': Share2,
  activity: Clock,
  admin: Shield,
  settings: Settings,
}

const Sidebar = ({ isMobile, isOpen, currentPage, onNavigate, onClose, user, isAuthenticated }) => {
  const className = [
    'sidebar',
    isMobile ? 'is-mobile' : '',
    isMobile && isOpen ? 'open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <aside className={className}>
      <div className="sidebar-header">
        <div className="sidebar-logo" aria-hidden="true">
          <Shield size={22} />
        </div>
        <div className="sidebar-brand">
          <span className="brand-name">SecureVault</span>
          <span className="brand-sub">Secure File Sharing</span>
        </div>
        {isMobile && (
          <button
            type="button"
            className="sidebar-close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const IconComponent = ICONS[item.key]
          const isActive = currentPage === item.key
          return (
            <button
              key={item.key}
              type="button"
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate(item.key)}
            >
              <IconComponent size={19} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-user"
          onClick={() => onNavigate('settings')}
        >
          <span className="user-avatar">
            {user?.name?.charAt(0).toUpperCase() || <User size={16} />}
          </span>
          <span className="sidebar-user-info">
            <span className="sidebar-user-name">
              {isAuthenticated ? user?.name || 'Signed in' : 'Not signed in'}
            </span>
            <span className="sidebar-user-email">
              {isAuthenticated ? user?.email || '' : 'Not signed in'}
            </span>
          </span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
