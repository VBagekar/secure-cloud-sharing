import { useEffect, useRef, useState } from 'react'
import { Menu, Search, Bell, LogOut, Settings, User } from './Icons'
import { NAV_ITEMS } from '../navigation'
import { api } from '../services/api'
import { describeError } from '../errors'

const TopBar = ({
  isMobile,
  onMenuClick,
  currentPage,
  onNavigate,
  onSearch,
  user,
  isAuthenticated,
  onSignOut,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [notifications, setNotifications] = useState({ status: 'idle', items: [], error: null })
  const wrapperRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowNotifications(false)
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!showNotifications) return undefined
    let active = true
    api
      .listNotifications()
      .then((items) => {
        if (active) {
          setNotifications({
            status: 'success',
            items: Array.isArray(items) ? items : [],
            error: null,
          })
        }
      })
      .catch((error) => {
        if (active) setNotifications({ status: 'error', items: [], error })
      })
    return () => {
      active = false
    }
  }, [showNotifications])

  const activeItem = NAV_ITEMS.find((item) => item.key === currentPage)

  const submitSearch = (event) => {
    event.preventDefault()
    onSearch?.(searchQuery.trim())
  }

  const toggleNotifications = () => {
    const next = !showNotifications
    setShowNotifications(next)
    setShowUserMenu(false)
    if (next) setNotifications((prev) => ({ ...prev, status: 'loading', error: null }))
  }

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        {isMobile && (
          <button
            type="button"
            className="icon-btn"
            onClick={onMenuClick}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
        )}
        <h1 className="top-bar-title">{activeItem?.label || 'Overview'}</h1>
      </div>

      <div className="top-bar-right" ref={wrapperRef}>
        <form className="search-box" onSubmit={submitSearch} role="search">
          <Search size={18} className="search-icon" />
          <input
            type="search"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search files"
          />
        </form>

        <div className="dropdown-anchor">
          <button
            type="button"
            className="icon-btn"
            onClick={toggleNotifications}
            aria-label="Notifications"
            aria-expanded={showNotifications}
          >
            <Bell size={20} />
          </button>
          {showNotifications && (
            <div className="dropdown notifications-dropdown">
              <div className="dropdown-header">Notifications</div>

              {notifications.status === 'loading' && (
                <div className="dropdown-empty">Loading notifications...</div>
              )}

              {notifications.status === 'error' && (
                <div className="dropdown-empty">
                  {describeError(notifications.error).message}
                </div>
              )}

              {notifications.status === 'success' && notifications.items.length === 0 && (
                <div className="dropdown-empty">No notifications.</div>
              )}

              {notifications.status === 'success' && notifications.items.length > 0 && (
                <ul className="notification-list">
                  {notifications.items.map((item, index) => (
                    <li key={item.id || index} className="notification-item">
                      <span className="notification-title">
                        {item.title || item.type || 'Notification'}
                      </span>
                      {(item.message || item.body) && (
                        <span className="notification-body">
                          {item.message || item.body}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                className="dropdown-footer-link"
                onClick={() => {
                  onNavigate('activity')
                  setShowNotifications(false)
                }}
              >
                View activity
              </button>
            </div>
          )}
        </div>

        <div className="dropdown-anchor">
          <button
            type="button"
            className="user-menu-btn"
            onClick={() => {
              setShowUserMenu((open) => !open)
              setShowNotifications(false)
            }}
            aria-label="User menu"
            aria-expanded={showUserMenu}
          >
            <span className="user-avatar">
              {user?.name?.charAt(0).toUpperCase() || <User size={16} />}
            </span>
            {!isMobile && (
              <span className="user-menu-name">
                {isAuthenticated ? user?.name || 'Signed in' : 'Not signed in'}
              </span>
            )}
          </button>
          {showUserMenu && (
            <div className="dropdown user-dropdown">
              <div className="dropdown-header">
                {isAuthenticated ? (
                  <>
                    <strong>{user?.name}</strong>
                    <span>{user?.email}</span>
                  </>
                ) : (
                  <>
                    <strong>Not signed in</strong>
                    <span>No active session</span>
                  </>
                )}
              </div>
              {isAuthenticated && (
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onNavigate('settings')
                    setShowUserMenu(false)
                  }}
                >
                  <Settings size={16} />
                  <span className="dropdown-item-main">Settings</span>
                </button>
              )}
              <button type="button" className="dropdown-item danger" onClick={onSignOut}>
                <LogOut size={16} />
                <span className="dropdown-item-main">
                  {isAuthenticated ? 'Sign out' : 'Sign in'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default TopBar
