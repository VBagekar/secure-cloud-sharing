import { useId, useState } from 'react'
import { Eye, EyeOff } from './Icons'

const PasswordField = ({
  label,
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder = '',
  hint = '',
  disabled = false,
  inputId,
}) => {
  const generatedId = useId()
  const id = inputId || generatedId
  const [visible, setVisible] = useState(false)

  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          className="toggle-password"
          onClick={() => setVisible((current) => !current)}
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
          disabled={disabled}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {hint && (
        <span id={`${id}-hint`} className="form-hint">
          {hint}
        </span>
      )}
    </div>
  )
}

export default PasswordField
