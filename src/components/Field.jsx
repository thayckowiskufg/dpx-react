import { useState } from 'react'

const NUMBER_PATTERN = /^[0-9]*[.,]?[0-9]*$/

function ChoiceButtons({ options, value, onSelect }) {
  return (
    <div className="choice-group">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`choice-button${value === option ? ' selected' : ''}`}
          onClick={() => onSelect(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function MultiChoiceChips({ options, value, onToggle }) {
  const selected = Array.isArray(value) ? value : []

  return (
    <div className="choice-group">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`choice-button${selected.includes(option) ? ' selected' : ''}`}
          onClick={() => onToggle(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function FileInput({ field, value, onChange }) {
  const files = Array.isArray(value) ? value : []
  const [localError, setLocalError] = useState('')

  function handleFiles(event) {
    const picked = Array.from(event.target.files || [])
    event.target.value = ''
    if (picked.length === 0) return

    const accepted = []
    let rejected = false

    picked.forEach((file) => {
      const typeOk = !field.accept || field.accept.includes(file.type)
      const sizeOk = !field.maxSizeMB || file.size <= field.maxSizeMB * 1024 * 1024
      if (!typeOk || !sizeOk) {
        rejected = true
        return
      }
      accepted.push(file)
    })

    if (rejected) {
      const sizePart = field.maxSizeMB ? ` e até ${field.maxSizeMB}MB` : ''
      setLocalError(`Formato inválido. Envie apenas arquivos ${field.acceptLabel}${sizePart}.`)
    } else {
      setLocalError('')
    }

    if (accepted.length === 0) return

    if (field.multiple) {
      onChange([...files, ...accepted])
    } else {
      onChange(accepted.slice(0, 1))
    }
  }

  function removeFile(index) {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="file-field">
      <input
        className="file-input"
        type="file"
        accept={field.acceptAttr}
        multiple={!!field.multiple}
        onChange={handleFiles}
      />
      {field.acceptLabel && (
        <p className="file-hint">
          Formatos aceitos: {field.acceptLabel}
          {field.maxSizeMB ? ` · até ${field.maxSizeMB}MB por arquivo` : ''}
        </p>
      )}
      {localError && <p className="field-error">{localError}</p>}
      {files.length > 0 && (
        <ul className="file-list">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`}>
              <span>{file.name}</span>
              <button type="button" className="file-remove" onClick={() => removeFile(index)}>
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Field({ field, value, onChange, error }) {
  const { label, type } = field

  function renderInput() {
    switch (type) {
      case 'text':
        return (
          <input
            className="text-input"
            type="text"
            value={value ?? ''}
            onChange={(event) => onChange(event.target.value)}
          />
        )

      case 'email':
        return (
          <input
            className="text-input"
            type="email"
            inputMode="email"
            placeholder="nome@exemplo.com"
            value={value ?? ''}
            onChange={(event) => onChange(event.target.value)}
          />
        )

      case 'number':
        return (
          <input
            className="text-input"
            type="text"
            inputMode="decimal"
            value={value ?? ''}
            onChange={(event) => {
              const next = event.target.value
              if (NUMBER_PATTERN.test(next)) onChange(next)
            }}
          />
        )

      case 'date':
        return (
          <input
            className="text-input"
            type="date"
            value={value ?? ''}
            onChange={(event) => onChange(event.target.value)}
          />
        )

      case 'textarea':
        return (
          <textarea
            className="text-input textarea"
            rows={4}
            value={value ?? ''}
            onChange={(event) => onChange(event.target.value)}
          />
        )

      case 'radio':
        return <ChoiceButtons options={field.options} value={value} onSelect={onChange} />

      case 'multiselect': {
        const selected = Array.isArray(value) ? value : []
        function toggle(option) {
          if (option === 'Nenhum' || option === 'Não avaliadas') {
            onChange(selected.includes(option) ? [] : [option])
            return
          }
          const withoutExclusive = selected.filter((item) => item !== 'Nenhum' && item !== 'Não avaliadas')
          if (withoutExclusive.includes(option)) {
            onChange(withoutExclusive.filter((item) => item !== option))
          } else {
            onChange([...withoutExclusive, option])
          }
        }
        return <MultiChoiceChips options={field.options} value={selected} onToggle={toggle} />
      }

      case 'file':
        return <FileInput field={field} value={value} onChange={onChange} />

      default:
        return null
    }
  }

  return (
    <div className="field">
      <label className="field-label">
        {label}
        {field.required && <span className="required-mark"> *</span>}
      </label>
      {renderInput()}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
