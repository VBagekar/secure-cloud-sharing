import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { BackendBanner } from './ConnectionBanners'
import { useAuth } from '../context/AuthContext'

const Layout = ({
  children,
  currentPage,
  setCurrentPage,
  user,
  onSignOut,
  onSearch,
}) => {
  const { isAuthenticated, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 900,
  )

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 900
      setIsMobile(mobile)
      if (!mobile) setSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleNavigate = (key) => {
    setCurrentPage(key)
    setSidebarOpen(false)
  }

  return (
    <div className="app-layout">
      <Sidebar
        isMobile={isMobile}
        isOpen={sidebarOpen}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onClose={() => setSidebarOpen(false)}
        user={user}
        isAuthenticated={isAuthenticated}
      />

      {isMobile && sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="app-main">
        <TopBar
          isMobile={isMobile}
          onMenuClick={() => setSidebarOpen((open) => !open)}
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onSearch={onSearch}
          user={user}
          isAuthenticated={isAuthenticated}
          onSignOut={onSignOut || signOut}
        />
        <div className="banner-stack">
          <BackendBanner />
        </div>
        <main className="main-content">{children}</main>
      </div>
    </div>
  )
}

export default Layout
