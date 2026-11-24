import { useState, type FocusEvent, type PointerEvent, type ReactNode } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { Wallet } from 'lucide-react'

type AuthCardProps = {
  title: string
  description: string
  children: ReactNode
}

const MAX_TILT_DEGREES = 5

function AuthCard({ title, description, children }: AuthCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const [hasCoarsePointer, setHasCoarsePointer] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )
  const [hasFocusedInput, setHasFocusedInput] = useState(false)
  const rotateXTarget = useMotionValue(0)
  const rotateYTarget = useMotionValue(0)
  const rotateX = useSpring(rotateXTarget, { stiffness: 260, damping: 24 })
  const rotateY = useSpring(rotateYTarget, { stiffness: 260, damping: 24 })
  const tiltEnabled = prefersReducedMotion !== true && !hasCoarsePointer

  function resetTilt() {
    rotateXTarget.set(0)
    rotateYTarget.set(0)
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (!tiltEnabled || hasFocusedInput || event.pointerType === 'touch') return

    const bounds = event.currentTarget.getBoundingClientRect()
    const horizontalPosition = (event.clientX - bounds.left) / bounds.width
    const verticalPosition = (event.clientY - bounds.top) / bounds.height
    const rotationLimit = (value: number) =>
      Math.max(-MAX_TILT_DEGREES, Math.min(MAX_TILT_DEGREES, value))
    rotateYTarget.set(rotationLimit((horizontalPosition * 2 - 1) * MAX_TILT_DEGREES))
    rotateXTarget.set(rotationLimit((1 - verticalPosition * 2) * MAX_TILT_DEGREES))
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setHasFocusedInput(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-12 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="relative w-full max-w-md [perspective:1000px]">
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-2xl border border-white/80 bg-white/65 shadow-xl shadow-indigo-500/10 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/65 dark:shadow-indigo-950/30"
        />
        <motion.section
          aria-labelledby="auth-card-title"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetTilt}
          onFocusCapture={() => setHasFocusedInput(true)}
          onBlurCapture={handleBlur}
          onPointerDown={(event) => {
            if (event.pointerType === 'touch') setHasCoarsePointer(true)
          }}
          style={{
            rotateX: tiltEnabled ? rotateX : 0,
            rotateY: tiltEnabled ? rotateY : 0,
            transformStyle: 'preserve-3d',
          }}
          className="relative rounded-2xl border border-white/80 bg-white/80 p-6 shadow-lg shadow-indigo-500/10 sm:p-8 dark:border-slate-700/80 dark:bg-slate-900/80 dark:shadow-indigo-950/30"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none">
              <Wallet aria-hidden="true" className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">FinTrack</span>
          </div>

          <h1 id="auth-card-title" className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
          {children}
        </motion.section>
      </div>
    </main>
  )
}

export default AuthCard
