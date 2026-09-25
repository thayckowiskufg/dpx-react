import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Country, State, City } from 'country-state-city'
import { uploadFilesToDrive, connectGoogleDrive, isDriveConnected } from '../api/googleDrive'

// Até 2 dígitos inteiros e 1 casa decimal (ex.: "12" ou "12,5") — suficiente
// para idade de animal em anos, e evita entradas absurdas tipo "12.34.56".
const NUMBER_PATTERN = /^[0-9]{0,2}([.,][0-9]{0,1})?$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ALL_COUNTRIES = Country.getAllCountries().sort((a, b) => a.name.localeCompare(b.name))

function LocationSelect({ placeholder, options, value, onChange, disabled }) {
  return (
    <select
      className="select-input"
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value || undefined)}
    >
      <option value="">{disabled ? placeholder.disabled : placeholder.enabled}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}

function CountryField({ value, onChange }) {
  const options = useMemo(() => ALL_COUNTRIES.map((country) => country.name), [])
  return (
    <LocationSelect
      placeholder={{ enabled: 'Selecione o país', disabled: 'Selecione o país' }}
      options={options}
      value={value}
      onChange={onChange}
    />
  )
}

function StateField({ value, onChange, countryName }) {
  const country = useMemo(() => ALL_COUNTRIES.find((item) => item.name === countryName), [countryName])
  const options = useMemo(() => {
    if (!country) return []
    return State.getStatesOfCountry(country.isoCode)
      .map((state) => state.name)
      .sort((a, b) => a.localeCompare(b))
  }, [country])

  // Alguns países não têm estados/províncias cadastrados na base: nesse caso,
  // libera um campo de texto livre para não travar quem preenche o formulário.
  if (country && options.length === 0) {
    return (
      <input
        className="text-input"
        type="text"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  return (
    <LocationSelect
      placeholder={{ enabled: 'Selecione o estado', disabled: 'Selecione o país primeiro' }}
      options={options}
      value={value}
      onChange={onChange}
      disabled={!country}
    />
  )
}

function CityField({ value, onChange, countryName, stateName }) {
  const country = useMemo(() => ALL_COUNTRIES.find((item) => item.name === countryName), [countryName])
  const state = useMemo(() => {
    if (!country) return null
    return State.getStatesOfCountry(country.isoCode).find((item) => item.name === stateName) ?? null
  }, [country, stateName])

  const options = useMemo(() => {
    if (!country || !state) return []
    return City.getCitiesOfState(country.isoCode, state.isoCode)
      .map((city) => city.name)
      .sort((a, b) => a.localeCompare(b))
  }, [country, state])

  // Sem estado selecionado, ou sem cidades cadastradas para ele, cai para texto livre.
  if (!state || options.length === 0) {
    return (
      <input
        className="text-input"
        type="text"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        disabled={!countryName}
        placeholder={!countryName ? 'Selecione o país e o estado primeiro' : undefined}
      />
    )
  }

  return (
    <LocationSelect
      placeholder={{ enabled: 'Selecione a cidade', disabled: 'Selecione o estado primeiro' }}
      options={options}
      value={value}
      onChange={onChange}
      disabled={!state}
    />
  )
}

function ChoiceButtons({ options, value, onSelect }) {
  return (
    <div className="choice-group">
      {options.map((option) => (
        <motion.button
          key={option}
          type="button"
          className={`choice-button${value === option ? ' selected' : ''}`}
          onClick={() => onSelect(option)}
          whileTap={{ scale: 0.96 }}
        >
          {option}
        </motion.button>
      ))}
    </div>
  )
}

function MultiChoiceChips({ options, value, onToggle }) {
  const selected = Array.isArray(value) ? value : []

  return (
    <div className="choice-group">
      {options.map((option) => (
        <motion.button
          key={option}
          type="button"
          className={`choice-button${selected.includes(option) ? ' selected' : ''}`}
          onClick={() => onToggle(option)}
          whileTap={{ scale: 0.96 }}
        >
          {option}
        </motion.button>
      ))}
    </div>
  )
}

function FileInput({ field, value, onChange }) {
  // Cada item de "files" é { name, url } depois de enviado para o Drive.
  const files = Array.isArray(value) ? value : []
  const [localError, setLocalError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [connected, setConnected] = useState(isDriveConnected())
  const [connecting, setConnecting] = useState(false)

  function handleConnect() {
    setConnecting(true)
    setLocalError('')
    connectGoogleDrive()
      .then(() => setConnected(true))
      .catch((error) => {
        setLocalError(error.message || 'Não foi possível conectar ao Google Drive. Tente novamente.')
      })
      .finally(() => setConnecting(false))
  }

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

    // Chamada síncrona (sem "await" antes) para preservar o gesto do usuário
    // e não deixar o navegador bloquear o popup de login do Google.
    setUploading(true)
    uploadFilesToDrive(accepted)
      .then((uploaded) => {
        setLocalError('')
        onChange(field.multiple ? [...files, ...uploaded] : uploaded.slice(0, 1))
      })
      .catch((error) => {
        setLocalError(error.message || 'Falha ao enviar o arquivo para o Google Drive. Tente novamente.')
      })
      .finally(() => setUploading(false))
  }

  function removeFile(index) {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="file-field">
      {!connected ? (
        <motion.button
          type="button"
          className="nav-button primary drive-connect-button"
          onClick={handleConnect}
          disabled={connecting}
          whileTap={{ scale: 0.97 }}
        >
          {connecting ? 'Conectando…' : 'Conectar ao Google Drive'}
        </motion.button>
      ) : (
        <input
          className="file-input"
          type="file"
          accept={field.acceptAttr}
          multiple={!!field.multiple}
          disabled={uploading}
          onChange={handleFiles}
        />
      )}
      {field.acceptLabel && (
        <p className="file-hint">
          Formatos aceitos: {field.acceptLabel}
          {field.maxSizeMB ? ` · até ${field.maxSizeMB}MB por arquivo` : ''}
        </p>
      )}
      {uploading && <p className="file-hint">Enviando para o Google Drive…</p>}
      {localError && <p className="field-error">{localError}</p>}
      {files.length > 0 && (
        <ul className="file-list">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`}>
              <a href={file.url} target="_blank" rel="noreferrer">
                {file.name}
              </a>
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

export default function Field({ field, value, answers, onChange, error }) {
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

      case 'email': {
        const isValid = !!value && EMAIL_PATTERN.test(value)
        return (
          <div className="email-field">
            <input
              className={`text-input${isValid ? ' valid' : ''}`}
              type="email"
              inputMode="email"
              placeholder="nome@exemplo.com"
              value={value ?? ''}
              onChange={(event) => onChange(event.target.value)}
            />
            {isValid && <span className="email-valid-icon">✓</span>}
          </div>
        )
      }

      case 'select':
        return (
          <LocationSelect
            placeholder={{ enabled: 'Selecione uma opção', disabled: 'Selecione uma opção' }}
            options={field.options}
            value={value}
            onChange={onChange}
          />
        )

      case 'country':
        return <CountryField value={value} onChange={onChange} />

      case 'state':
        return <StateField value={value} onChange={onChange} countryName={answers?.[field.dependsOn]} />

      case 'city':
        return (
          <CityField
            value={value}
            onChange={onChange}
            countryName={answers?.pais}
            stateName={answers?.[field.dependsOn]}
          />
        )

      case 'number':
        return (
          <div className={`number-field${field.unit ? ' with-unit' : ''}`}>
            <input
              className="text-input"
              type="text"
              inputMode="decimal"
              maxLength={5}
              value={value ?? ''}
              onChange={(event) => {
                const next = event.target.value
                if (NUMBER_PATTERN.test(next)) onChange(next)
              }}
            />
            {field.unit && <span className="number-unit">{field.unit}</span>}
          </div>
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
        // Apesar do nome (mantido por compatibilidade com o schema e a
        // planilha), só é permitido selecionar uma alternativa por vez.
        // Com mais de 5 opções, um dropdown é mais fácil de navegar do que
        // uma grade de chips — mesma lógica usada no campo de cidade.
        const selected = Array.isArray(value) ? value : []

        if (field.options.length > 5) {
          return (
            <LocationSelect
              placeholder={{ enabled: 'Selecione uma opção', disabled: 'Selecione uma opção' }}
              options={field.options}
              value={selected[0]}
              onChange={(option) => onChange(option ? [option] : [])}
            />
          )
        }

        function toggle(option) {
          onChange(selected.includes(option) ? [] : [option])
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
