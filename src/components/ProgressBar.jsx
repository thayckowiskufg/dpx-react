import { motion } from 'framer-motion'

export default function ProgressBar({ current, total }) {
  const percent = Math.round((current / total) * 100)

  return (
    <div className="progress-wrap">
      <div className="progress-track">
        <motion.div
          className="progress-fill"
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        />
      </div>
      <span className="progress-label">
        Seção {current} de {total}
      </span>
    </div>
  )
}
