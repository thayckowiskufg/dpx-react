import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ProgressBar from './components/ProgressBar'
import Field from './components/Field'
import { sections } from './data/schema'
import { submitAnswers } from './api/submitAnswers'
import './App.css'

const ALL_FIELDS = sections.flatMap((section) => section.fields)

const STEPS = [...sections.map((section) => ({ kind: 'section', section })), { kind: 'review' }]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isVisible(field, answers) {
  if (!field.condition) return true
  const currentValue = answers[field.condition.field]
  if (field.condition.in) return field.condition.in.includes(currentValue)
  return currentValue === field.condition.equals
}

function hasValue(value) {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.length > 0
  return true
}

function fieldError(field, answers) {
  if (!isVisible(field, answers)) return null
  const value = answers[field.id]

  if (field.required && !hasValue(value)) return 'Esse campo é obrigatório.'

  if (field.type === 'email' && hasValue(value) && !EMAIL_PATTERN.test(value)) {
    return 'Informe um e-mail em um formato válido.'
  }

  return null
}

export default function App() {
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('dpx-theme') || 'light')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('dpx-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  const step = STEPS[stepIndex]

  const visibleFields = useMemo(() => {
    if (step.kind !== 'section') return []
    return step.section.fields.filter((field) => isVisible(field, answers))
  }, [step, answers])

  function updateAnswer(fieldId, value) {
    setAnswers((prev) => {
      const next = { ...prev, [fieldId]: value }
      // Limpa campos condicionais órfãos quando a condição deixa de ser satisfeita.
      ALL_FIELDS.forEach((field) => {
        if (field.condition?.field === fieldId && !isVisible(field, next)) {
          delete next[field.id]
        }
      })
      // Limpa campos em cascata (ex.: estado, cidade) quando o campo do qual dependem muda,
      // propagando em cadeia (mudar o país limpa o estado, que por sua vez limpa a cidade).
      // ALL_FIELDS segue a ordem do schema, então um passe único já resolve a cadeia.
      ALL_FIELDS.forEach((field) => {
        if (field.dependsOn && next[field.dependsOn] === undefined && next[field.id] !== undefined) {
          delete next[field.id]
        }
      })
      return next
    })
    setErrors((prev) => ({ ...prev, [fieldId]: undefined }))
  }

  function validateCurrentScreen() {
    const nextErrors = {}
    visibleFields.forEach((field) => {
      const message = fieldError(field, answers)
      if (message) nextErrors[field.id] = message
    })
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function goNext() {
    if (!validateCurrentScreen()) return
    setStepIndex((index) => Math.min(index + 1, STEPS.length - 1))
  }

  function goBack() {
    setStepIndex((index) => Math.max(index - 1, 0))
  }

  function goToStep(index) {
    setStepIndex(index)
  }

  async function handleConfirm() {
    await submitAnswers(answers)
    setDone(true)
  }

  if (done) {
    return (
      <div className="app-shell">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <motion.div
          className="card"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        >
          <h1>Respostas registradas</h1>
          <p>Suas respostas foram enviadas com sucesso. Muito obrigado pela contribuição!</p>
        </motion.div>
      </div>
    )
  }

  const stepKey = step.kind === 'section' ? step.section.id : 'review'

  return (
    <div className="app-shell">
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
      <div className="card">
        <ProgressBar current={stepIndex + 1} total={STEPS.length} />

        <AnimatePresence mode="wait">
          <motion.div
            key={stepKey}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {step.kind === 'section' && (
              <Screen
                section={step.section}
                fields={visibleFields}
                answers={answers}
                errors={errors}
                onChange={updateAnswer}
                onNext={goNext}
                onBack={stepIndex > 0 ? goBack : null}
              />
            )}

            {step.kind === 'review' && (
              <ReviewScreen answers={answers} onBack={goBack} onEdit={goToStep} onConfirm={handleConfirm} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function ThemeToggle({ theme, onToggle }) {
  return (
    <motion.button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      whileTap={{ scale: 0.9 }}
      aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </motion.button>
  )
}

function ScreenHeader({ title, subtitle }) {
  return (
    <div className="screen-header">
      <h2>{title}</h2>
      {subtitle && <p className="screen-subtitle">{subtitle}</p>}
    </div>
  )
}

function NavButtons({ onBack, onNext, nextLabel = 'Próximo' }) {
  return (
    <div className="nav-buttons">
      {onBack ? (
        <motion.button type="button" className="nav-button secondary" onClick={onBack} whileTap={{ scale: 0.97 }}>
          Anterior
        </motion.button>
      ) : (
        <span />
      )}
      <motion.button type="button" className="nav-button primary" onClick={onNext} whileTap={{ scale: 0.97 }}>
        {nextLabel}
      </motion.button>
    </div>
  )
}

function Screen({ section, fields, answers, errors, onChange, onNext, onBack }) {
  return (
    <div>
      <ScreenHeader title={section.title} />
      {fields.map((field) => (
        <Field
          key={field.id}
          field={field}
          value={answers[field.id]}
          answers={answers}
          error={errors[field.id]}
          onChange={(value) => onChange(field.id, value)}
        />
      ))}
      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  )
}

function ReviewScreen({ answers, onBack, onEdit, onConfirm }) {
  return (
    <div>
      <ScreenHeader title="Revisão das respostas" subtitle="Confira tudo antes de confirmar o envio." />

      {sections.map((section, index) => (
        <ReviewSection key={section.id} title={section.title} fields={section.fields} answers={answers} onEdit={() => onEdit(index)} />
      ))}

      <NavButtons onBack={onBack} onNext={onConfirm} nextLabel="Confirmar envio" />
    </div>
  )
}

function formatAnswer(field, value) {
  if (field.type === 'file') {
    const files = Array.isArray(value) ? value : []
    return files.map((file) => file.name).join(', ')
  }
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

function ReviewSection({ title, fields, answers, onEdit }) {
  const respondidos = fields.filter((field) => isVisible(field, answers) && hasValue(answers[field.id]))

  if (respondidos.length === 0) return null

  return (
    <div className="review-section">
      <div className="review-section-header">
        <h3>{title}</h3>
        <button type="button" className="edit-link" onClick={onEdit}>
          Editar
        </button>
      </div>
      {respondidos.map((field) => (
        <p key={field.id} className="review-item">
          <strong>{field.label}:</strong> {formatAnswer(field, answers[field.id])}
        </p>
      ))}
    </div>
  )
}
