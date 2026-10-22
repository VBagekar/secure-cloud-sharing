import { Share2, Trash, Clock, User, Download } from '../components/Icons'
import { LoadingState, EmptyState, ErrorState } from '../components/StateViews'
import { useToast } from '../components/Toast'
import { api } from '../services/api'
import { useAsync } from '../hooks/useAsync'
import { formatDate } from '../utils/format'
import { NotConfiguredError } from '../errors'

const SharedWithMePage = () => {
  const { addToast } = useToast()
  const { status, data, error, reload, setData } = useAsync(async () => {
    const shares = await api.listSharedWithMe()
    return shares || []
  }, [])

  const shares = Array.isArray(data) ? data : []

  const handleRevoke = async (share) => {
    try {
      await api.revokeShare(share.id || share.shareId)
      setData((prev) => prev.filter((s) => (s.id || s.shareId) !== (share.id || share.shareId)))
      addToast('Share revoked.', 'success')
    } catch (err) {
      addToast(err.message || 'Revoke failed.', 'error')
    }
  }

  const handleDownload = async (share) => {
    const fileId = share.fileId
    if (!fileId) {
      addToast('This share does not include a file id, so it cannot be downloaded.', 'warning')
      return
    }
    try {
      const url = await api.getDownloadUrl(fileId)
      const link = document.createElement('a')
      link.href = url
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      if (err instanceof NotConfiguredError) {
        addToast(err.message, 'warning')
        return
      }
      addToast(err.message || 'Download failed.', 'error')
    }
  }

  if (status === 'loading') return <LoadingState label="Loading shared files..." />
  if (status === 'error') return <ErrorState error={error} onRetry={reload} />

  return (
    <section className="page shared-with-me-page">
      <div className="page-header">
        <div>
          <h2>Shared with Me</h2>
          <p className="page-subtitle">Files shared with you as reported by the backend.</p>
        </div>
      </div>

      {shares.length === 0 ? (
        <EmptyState
          icon={Share2}
          title="No shared files"
          message="No shared files were returned by the backend."
        />
      ) : (
        <div className="shared-list">
          {shares.map((share) => (
            <div key={share.id || share.shareId} className="shared-card">
              <div className="shared-card-main">
                <div className="shared-card-info">
                  <span className="file-name">{share.fileName || share.name}</span>
                  <span className="file-meta">
                    <User size={13} /> {share.owner || share.ownerEmail || 'Unknown'}
                  </span>
                </div>
              </div>
              <div className="shared-meta">
                <span className="pill pill-permission">{share.permission || 'viewer'}</span>
                <span className="meta-item">
                  <Clock size={13} /> Shared {formatDate(share.sharedAt || share.dateShared)}
                </span>
                {share.expiresAt || share.expires ? (
                  <span className="meta-item">
                    Expires {formatDate(share.expiresAt || share.expires)}
                  </span>
                ) : (
                  <span className="meta-item muted">No expiry</span>
                )}
              </div>
              <div className="card-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => handleDownload(share)}
                  aria-label={`Download ${share.fileName || share.name || 'shared file'}`}
                >
                  <Download size={15} /> Download
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => handleRevoke(share)}
                >
                  <Trash size={15} /> Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default SharedWithMePage
