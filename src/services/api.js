import { apiClient } from './apiClient'
import { ApiError } from '../errors'

const normalizeList = (data, keys) => {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    for (const key of keys) {
      if (Array.isArray(data[key])) return data[key]
    }
  }
  return []
}

const buildQuery = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value)
    }
  })
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export const api = {
  async listFiles(params = {}) {
    const data = await apiClient.get(`/files${buildQuery(params)}`)
    return normalizeList(data, ['files', 'items', 'data'])
  },

  async createUploadUrl({ fileName, contentType, sizeBytes }) {
    const data = await apiClient.post('/files/upload-url', {
      fileName,
      contentType,
      sizeBytes,
    })
    const uploadUrl = data && (data.uploadUrl || data.url)
    if (!uploadUrl) {
      throw new ApiError('The backend did not return an upload URL.', 200, data)
    }
    return {
      uploadUrl,
      fileId: (data && (data.fileId || data.id)) || null,
      headers: (data && data.headers) || null,
    }
  },

  async uploadFile(file, onProgress) {
    if (!file) {
      throw new ApiError('No file was selected for upload.', 400)
    }

    const { uploadUrl, fileId, headers } = await this.createUploadUrl({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    })

    const uploadHeaders = {
      'Content-Type': file.type || 'application/octet-stream',
      ...(headers || {}),
    }

    await apiClient.uploadToUrl(uploadUrl, file, { onProgress, headers: uploadHeaders })

    return { fileId, name: file.name, sizeBytes: file.size, contentType: file.type || null }
  },

  async getDownloadUrl(fileId) {
    const data = await apiClient.get(`/files/${encodeURIComponent(fileId)}/download`)
    const url = data && (data.url || data.downloadUrl)
    if (!url) {
      throw new ApiError('The backend did not return a download URL.', 200, data)
    }
    return url
  },

  async deleteFile(fileId) {
    await apiClient.del(`/files/${encodeURIComponent(fileId)}`)
  },

  async listSharedWithMe() {
    const data = await apiClient.get('/shares/received')
    return normalizeList(data, ['shares', 'items', 'data'])
  },

  async shareFile({ fileId, recipient, permission, expiresAt }) {
    return apiClient.post('/shares', {
      fileId,
      recipient,
      permission,
      expiresAt: expiresAt || null,
    })
  },

  async revokeShare(shareId) {
    await apiClient.del(`/shares/${encodeURIComponent(shareId)}`)
  },

  async listActivity(params = {}) {
    const data = await apiClient.get(`/activity${buildQuery(params)}`)
    return normalizeList(data, ['activities', 'items', 'data'])
  },

  async listNotifications() {
    const data = await apiClient.get('/notifications')
    return normalizeList(data, ['notifications', 'items', 'data'])
  },

  async listTeamMembers() {
    const data = await apiClient.get('/admin/members')
    return normalizeList(data, ['members', 'items', 'data'])
  },

  async getStats() {
    return apiClient.get('/stats')
  },

  async getIntegrationStatus() {
    return apiClient.get('/admin/integrations')
  },

  async getSecurityChecklist() {
    const data = await apiClient.get('/admin/security-checklist')
    return normalizeList(data, ['checklist', 'items', 'data'])
  },
}
