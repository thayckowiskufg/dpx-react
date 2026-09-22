import { useMemo, useState } from 'react'
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
        <div className="card">
          <h1>Respostas registradas</h1>
          <p>Suas respostas foram enviadas com sucesso. Muito obrigado pela contribuição!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="card">
        <ProgressBar current={stepIndex + 1} total={STEPS.length} />

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
      </div>
    </div>
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
        <button type="button" className="nav-button secondary" onClick={onBack}>
          Anterior
        </button>
      ) : (
        <span />
      )}
      <button type="button" className="nav-button primary" onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  )
}

function Screen({ section, fields, answers, errors, onChange, onNext, onBack }) {
  return (
    <div>
      <ScreenHeader title={section.title} />
      {fields.map((field) => (
        <Field key={field.id} field={field} value={answers[field.id]} error={errors[field.id]} onChange={(value) => onChange(field.id, value)} />
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
