import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Upload,
  Search,
  Share2,
  Download,
  Trash,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Loader2,
  FolderOpen,
  X,
  Info,
} from '../components/Icons'
import FileTypeIcon from '../components/FileTypeIcon'
import ShareDialog from '../components/ShareDialog'
import { LoadingState, EmptyState, ErrorState } from '../components/StateViews'
import { useToast } from '../components/Toast'
import { api } from '../services/api'
import { useAsync } from '../hooks/useAsync'
import { parseSize, formatBytes } from '../utils/format'
import { NotConfiguredError } from '../errors'

const SortIndicator = ({ active, dir }) => {
  if (!active) return <ArrowUpDown size={13} className="sort-indicator muted" />
  return dir === 'asc' ? (
    <ChevronUp size={13} className="sort-indicator" />
  ) : (
    <ChevronDown size={13} className="sort-indicator" />
  )
}

const MyFilesPage = ({ initialSearch = '' }) => {
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [sortBy, setSortBy] = useState('modifiedAt')
  const [sortDir, setSortDir] = useState('desc')
  const [shareTarget, setShareTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
  const { addToast } = useToast()

  useEffect(() => {
    setSearchQuery(initialSearch)
  }, [initialSearch])

  const { status, data, error, reload, setData } = useAsync(async () => {
    const files = await api.listFiles()
    return files || []
  }, [])

  const files = Array.isArray(data) ? data : []

  const handleUpload = async (fileList) => {
    const incoming = Array.from(fileList || []).filter(Boolean)
    if (incoming.length === 0) return
    setIsUploading(true)
    let uploaded = 0
    for (const file of incoming) {
      try {
        await api.uploadFile(file)
        uploaded += 1
      } catch (err) {
        addToast(err.message || `Failed to upload ${file.name}.`, 'error')
        break
      }
    }
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (uploaded > 0) {
      await reload()
      addToast(uploaded === 1 ? 'File uploaded.' : `${uploaded} files uploaded.`, 'success')
    }
  }

  const handleDownload = async (file) => {
    try {
      const url = await api.getDownloadUrl(file.id || file.fileId)
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

  const handleDelete = async (file) => {
    try {
      await api.deleteFile(file.id || file.fileId)
      setData((prev) => prev.filter((f) => (f.id || f.fileId) !== (file.id || file.fileId)))
      setDeleteTarget(null)
      addToast('File deleted.', 'success')
    } catch (err) {
      addToast(err.message || 'Delete failed.', 'error')
    }
  }

  const handleShareSubmit = async (fileId, recipient, permission, expiryDate) => {
    await api.shareFile({
      fileId: fileId || shareTarget?.id,
      recipient,
      permission,
      expiresAt: expiryDate || null,
    })
    addToast('File shared.', 'success')
    setShareTarget(null)
  }

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return files
    return files.filter((file) => {
      const fields = [file.name, file.fileName, file.filename, file.owner, file.ownerEmail]
      return fields.some((v) => (v || '').toLowerCase().includes(query))
    })
  }, [files, searchQuery])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let result = 0
      if (sortBy === 'name') {
        result = String(a.name || a.fileName || '').localeCompare(
          String(b.name || b.fileName || ''),
        )
      } else if (sortBy === 'size') {
        result = parseSize(a.size || a.sizeBytes) - parseSize(b.size || b.sizeBytes)
      } else if (sortBy === 'modifiedAt' || sortBy === 'modified') {
        const timeA = new Date(a.modifiedAt || a.modified || 0).getTime()
        const timeB = new Date(b.modifiedAt || b.modified || 0).getTime()
        result = timeA - timeB
      } else if (sortBy === 'owner') {
        result = String(a.owner || '').localeCompare(String(b.owner || ''))
      }
      return sortDir === 'asc' ? result : -result
    })
  }, [filtered, sortBy, sortDir])

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(field)
      setSortDir('asc')
    }
  }

  if (status === 'loading') return <LoadingState label="Loading files..." />
  if (status === 'error') return <ErrorState error={error} onRetry={reload} />

  const hasFiles = files.length > 0
  const hasResults = sorted.length > 0

  return (
    <section className="page my-files-page">
      <div className="page-header">
        <div>
          <h2>My Files</h2>
          <p className="page-subtitle">Files returned by the backend for the current user.</p>
        </div>
        <div className="header-actions">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="visually-hidden"
            onChange={(e) => handleUpload(e.target.files)}
            aria-label="Choose files to upload"
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 size={16} /> : <Upload size={16} />}
            {isUploading ? 'Uploading...' : 'Upload files'}
          </button>
        </div>
      </div>

      <div
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          handleUpload(e.dataTransfer.files)
        }}
      >
        <Upload size={20} />
        <span>Drag and drop files to upload via the backend API.</span>
      </div>

      <div className="toolbar">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="search"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search files"
          />
        </div>
      </div>

      {!hasFiles && !hasResults && (
        <EmptyState
          icon={FolderOpen}
          title="No files found"
          message="No files were returned by the backend. Files appear only when the API is connected and authorizes you."
        />
      )}

      {hasFiles && !hasResults && (
        <EmptyState
          icon={Search}
          title="No matches"
          message="No files match the current search."
        />
      )}

      {hasResults && (
        <div className="table-wrapper">
          <table className="file-table">
            <thead>
              <tr>
                <th>
                  <button
                    type="button"
                    className="th-sortable"
                    onClick={() => toggleSort('name')}
                  >
                    Name <SortIndicator active={sortBy === 'name'} dir={sortDir} />
                  </button>
                </th>
                <th>Type</th>
                <th>
                  <button
                    type="button"
                    className="th-sortable"
                    onClick={() => toggleSort('size')}
                  >
                    Size <SortIndicator active={sortBy === 'size'} dir={sortDir} />
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="th-sortable"
                    onClick={() => toggleSort('owner')}
                  >
                    Owner <SortIndicator active={sortBy === 'owner'} dir={sortDir} />
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="th-sortable"
                    onClick={() => toggleSort('modifiedAt')}
                  >
                    Modified <SortIndicator active={sortBy === 'modifiedAt'} dir={sortDir} />
                  </button>
                </th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((file) => (
                <tr key={file.id || file.fileId}>
                  <td>
                    <div className="file-name-cell">
                      <FileTypeIcon type={file.type || file.mimeType || 'File'} />
                      <span className="file-name">{file.name || file.fileName}</span>
                    </div>
                  </td>
                  <td className="muted-cell">{file.type || file.mimeType || '—'}</td>
                  <td className="muted-cell">
                    {file.sizeBytes !== undefined
                      ? formatBytes(file.sizeBytes)
                      : file.size || '—'}
                  </td>
                  <td className="muted-cell">{file.owner || file.ownerEmail || '—'}</td>
                  <td className="muted-cell">
                    {file.modifiedAt || file.modified || file.updatedAt || '—'}
                  </td>
                  <td className="col-actions">
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setShareTarget(file)}
                        aria-label={`Share ${file.name || file.fileName}`}
                        title="Share"
                      >
                        <Share2 size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => handleDownload(file)}
                        aria-label={`Download ${file.name || file.fileName}`}
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => setDeleteTarget(file)}
                        aria-label={`Delete ${file.name || file.fileName}`}
                        title="Delete"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {shareTarget && (
        <ShareDialog
          fileId={shareTarget.id || shareTarget.fileId}
          fileName={shareTarget.name || shareTarget.fileName}
          onClose={() => setShareTarget(null)}
          onConfirm={handleShareSubmit}
        />
      )}

      {deleteTarget && (
        <div className="modal-overlay" onMouseDown={() => setDeleteTarget(null)}>
          <div
            className="modal-window modal-sm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="delete-dialog-title">
                <Trash size={18} /> Confirm delete
              </h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setDeleteTarget(null)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Delete <strong>{deleteTarget.name || deleteTarget.fileName}</strong>? This action
                requires confirmation from the backend and is authorized only if permitted.
              </p>
              <div className="demo-callout">
                <Info size={16} />
                <span>Nothing is deleted locally — the request goes to the configured backend.</span>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleDelete(deleteTarget)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default MyFilesPage
