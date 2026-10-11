import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import { LoadingState } from './components/StateViews'
import LoginPage from './pages/LoginPage'
import OverviewDashboard from './pages/OverviewDashboard'
import MyFilesPage from './pages/MyFilesPage'
import SharedWithMePage from './pages/SharedWithMePage'
import ActivityPage from './pages/ActivityPage'
import AdminDashboard from './pages/AdminDashboard'
import SettingsPage from './pages/SettingsPage'

const App = () => {
  const { canAccessApp, isRestoring, user, signOut } = useAuth()
  const [currentPage, setCurrentPage] = useState('overview')
  const [globalSearch, setGlobalSearch] = useState('')

  if (isRestoring) {
    return (
      <div className="login-page">
        <LoadingState label="Restoring your session..." />
      </div>
    )
  }

  if (!canAccessApp) {
    return <LoginPage />
  }

  const handleGlobalSearch = (query) => {
    setGlobalSearch(query)
    setCurrentPage('my-files')
  }

  const pages = {
    overview: <OverviewDashboard onNavigate={setCurrentPage} />,
    'my-files': <MyFilesPage initialSearch={globalSearch} />,
    'shared-with-me': <SharedWithMePage />,
    activity: <ActivityPage />,
    admin: <AdminDashboard />,
    settings: <SettingsPage user={user} onSignOut={signOut} />,
  }

  return (
    <Layout
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      user={user}
      onSignOut={signOut}
      onSearch={handleGlobalSearch}
    >
      {pages[currentPage] || pages.overview}
    </Layout>
  )
}

export default App
