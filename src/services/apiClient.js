import { API_BASE_URL, isBackendConfigured } from '../config'
import {
  ApiError,
  ForbiddenError,
  NetworkError,
  NotConfiguredError,
  NotImplementedError,
  UnauthorizedError,
  ValidationError,
} from '../errors'

let tokenProvider = () => null

export const setTokenProvider = (provider) => {
  tokenProvider = typeof provider === 'function' ? provider : () => null
}

const buildUrl = (path) => {
  const base = API_BASE_URL.replace(/\/+$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${base}${suffix}`
}

const buildHeaders = (extra = {}) => {
  const headers = { Accept: 'application/json', ...extra }
  const token = tokenProvider()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

const errorFromStatus = (status, details) => {
  const message = details && (details.message || details.error)
  if (status === 401) return new UnauthorizedError(message)
  if (status === 403) return new ForbiddenError(message)
  if (status === 400 || status === 422) return new ValidationError(message)
  if (status === 501) return new NotImplementedError(message)
  return new ApiError(message, status, details)
}

const parseBody = async (response) => {
  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const text = await response.text()
    return text ? JSON.parse(text) : null
  }
  return response
}

async function send(path, options = {}) {
  if (!isBackendConfigured) {
    throw new NotConfiguredError()
  }

  const { method = 'GET', body, headers, signal, isFormData = false } = options
  const finalHeaders = buildHeaders(headers)
  let payload = body

  if (body !== undefined && body !== null && !isFormData) {
    finalHeaders['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(buildUrl(path), { method, headers: finalHeaders, body: payload, signal })
  } catch (error) {
    if (error && error.name === 'AbortError') throw error
    throw new NetworkError()
  }

  if (!response.ok) {
    let details = null
    try {
      details = await response.json()
    } catch {
      details = null
    }
    throw errorFromStatus(response.status, details)
  }

  return parseBody(response)
}

function uploadToUrl(url, file, options = {}) {
  const { onProgress, signal, headers = {} } = options

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)

    Object.entries(headers).forEach(([key, value]) => {
      if (value !== undefined && value !== null) xhr.setRequestHeader(key, value)
    })

    if (xhr.upload && typeof onProgress === 'function') {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ status: xhr.status })
        return
      }
      let details = null
      try {
        details = xhr.responseText ? JSON.parse(xhr.responseText) : null
      } catch {
        details = null
      }
      reject(errorFromStatus(xhr.status, details))
    }

    xhr.onerror = () =>
      reject(
        new NetworkError(
          'File upload to storage failed. Check your connection and try again.',
        ),
      )
    xhr.onabort = () => reject(new DOMException('Request aborted', 'AbortError'))

    if (signal) {
      if (signal.aborted) {
        xhr.abort()
        return
      }
      signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }

    xhr.send(file)
  })
}

export const apiClient = {
  request: send,
  get: (path, options) => send(path, { ...options, method: 'GET' }),
  post: (path, body, options) => send(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => send(path, { ...options, method: 'PUT', body }),
  del: (path, options) => send(path, { ...options, method: 'DELETE' }),
  uploadToUrl,
}
