import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from './Icons'

const ToastContext = createContext(null)

const ToastIcon = ({ type }) => {
  if (type === 'success') return <CheckCircle size={18} />
  if (type === 'error') return <XCircle size={18} />
  if (type === 'warning') return <AlertTriangle size={18} />
  return <Info size={18} />
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback(
    (message, type = 'info', duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`
      setToasts((prev) => [...prev, { id, message, type }])
      window.setTimeout(() => removeToast(id), duration)
    },
    [removeToast],
  )

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <ToastIcon type={toast.type} />
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    return { addToast: () => {} }
  }
  return context
}
