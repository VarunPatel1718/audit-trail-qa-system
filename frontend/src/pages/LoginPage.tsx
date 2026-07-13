import { type FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from '../components/ThemeToggle'

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login({ email, password }, remember)
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Incorrect email or password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-[18px] bg-bg-light p-6 dark:bg-bg-dark">
      <div className="relative w-[420px] rounded-card border border-surface-border-light bg-surface-light p-9 px-8 shadow-card backdrop-blur-[14px] dark:border-surface-border-dark dark:bg-surface-dark dark:shadow-card-dark">
        <ThemeToggle className="absolute right-5 top-5 h-[34px] w-[34px]" />

        <div className="mb-1 mt-1 flex items-center gap-3">
          <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] border border-gold-tint-border-light bg-gold-tint-strong-light dark:border-gold-tint-border-dark dark:bg-gold-tint-strong-dark">
            <div className="h-4 w-4 rounded bg-gold-light dark:bg-gold-dark" />
          </div>
          <div>
            <div className="font-sans text-[16.5px] font-bold tracking-tight text-hi-light dark:text-hi-dark">
              Audit Trail Q&amp;A System
            </div>
            <div className="mt-0.5 font-sans text-[12.5px] text-muted-light dark:text-muted-dark">
              Internal Audit &amp; Compliance Platform
            </div>
          </div>
        </div>

        <div className="my-[22px] h-px bg-divider-light dark:bg-divider-dark" />

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-[7px] font-sans text-[12.5px] font-semibold tracking-wide text-muted-light dark:text-muted-dark">
            Email address
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@rbi-regulated-entity.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-input-border-light bg-input-light px-3 py-2.5 font-sans text-[14.5px] text-hi-light focus:ring-2 focus:ring-gold-light/40 dark:border-input-border-dark dark:bg-input-dark dark:text-hi-dark dark:focus:ring-gold-dark/40"
            />
          </label>

          <label className="flex flex-col gap-[7px] font-sans text-[12.5px] font-semibold tracking-wide text-muted-light dark:text-muted-dark">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input-border-light bg-input-light px-3 py-2.5 font-sans text-[14.5px] text-hi-light focus:ring-2 focus:ring-gold-light/40 dark:border-input-border-dark dark:bg-input-dark dark:text-hi-dark dark:focus:ring-gold-dark/40"
            />
          </label>

          <div className="-mt-0.5 flex items-center justify-between">
            <label className="flex items-center gap-[7px] font-sans text-[12.5px] font-medium text-muted-light dark:text-muted-dark">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-[14px] w-[14px] accent-gold-light dark:accent-gold-dark"
              />
              Remember this device
            </label>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="font-sans text-[12.5px] font-semibold text-gold-light hover:underline dark:text-gold-dark"
            >
              Forgot password?
            </a>
          </div>

          {error && (
            <div className="font-sans text-[12.5px] font-medium text-critical-text-light dark:text-critical-text-dark">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1.5 rounded-lg bg-gold-light py-[11px] font-sans text-[14.5px] font-bold tracking-wide text-on-gold-light disabled:opacity-60 dark:bg-gold-dark dark:text-on-gold-dark"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-[22px] flex items-center gap-2 font-sans text-[11.5px] leading-relaxed text-muted-light dark:text-muted-dark">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-secure-light dark:bg-secure-dark" />
          Access is logged and monitored per RBI audit &amp; compliance guidelines
        </div>
      </div>

      <div className="font-sans text-[11.5px] tracking-wide text-muted-light dark:text-muted-dark">
        © 2026 Audit Trail Q&amp;A System · Role-based access · Auditor / Finance Manager / Admin
      </div>
    </div>
  )
}
