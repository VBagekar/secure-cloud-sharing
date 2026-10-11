import { useEffect, useState } from 'react'
import { X, Calendar, Loader2, Share2, Info } from './Icons'

const ShareDialog = ({ onClose, onConfirm, fileId, fileName }) => {
  const [recipient, setRecipient] = useState('')
  const [permission, setPermission] = useState('viewer')
  const [expiryDate, setExpiryDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleConfirm = async (event) => {
    event.preventDefault()
    setError('')

    if (!recipient.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim())) {
      setError('Please enter a valid recipient email address.')
      return
    }

    setIsLoading(true)
    try {
      await onConfirm(fileId, recipient.trim(), permission, expiryDate || undefined)
      setIsLoading(false)
      onClose()
    } catch (err) {
      setError(err.message || 'Unable to share this file.')
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="share-dialog-title">
            <Share2 size={18} /> Share file
          </h3>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close share dialog"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleConfirm}>
          <div className="modal-body">
            <div className="selected-file-info">
              <span className="selected-file-label">File</span>
              <span className="selected-file-name">{fileName}</span>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="recipient-email">Recipient email</label>
              <input
                id="recipient-email"
                type="email"
                placeholder="recipient@company.com"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
                aria-describedby="recipient-help"
              />
              <p id="recipient-help" className="help-text">
                The recipient will be granted access to this file.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="permission-level">Access permission</label>
              <select
                id="permission-level"
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
              >
                <option value="viewer">Viewer — can view and download</option>
                <option value="editor">Editor — can view, download and edit</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="expiry-date">
                <Calendar size={14} /> Expiry date (optional)
              </label>
              <input
                id="expiry-date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
              <p className="help-text">Access is automatically revoked after this date.</p>
            </div>

            <div className="demo-callout">
              <Info size={16} />
              <span>
                This creates a real share through the backend. Access is granted only after the
                backend confirms the operation.
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary">
              {isLoading ? (
                <>
                  <Loader2 size={16} /> Sharing...
                </>
              ) : (
                <>
                  <Share2 size={16} /> Share file
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ShareDialog
