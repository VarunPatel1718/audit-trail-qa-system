import { useTheme } from '../context/ThemeContext'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className={
        'flex items-center justify-center rounded-full border text-[15px] ' +
        'border-surface-border-light dark:border-surface-border-dark ' +
        'bg-input-light dark:bg-input-dark text-gold-light dark:text-gold-dark ' +
        'cursor-pointer transition-colors hover:opacity-80 ' +
        className
      }
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  )
}
