import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const readTheme = (): Theme =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('light') ? 'light' : 'dark';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    root.classList.add('theme-transition');
    root.classList.toggle('light', next === 'light');
    try {
      localStorage.setItem('gitship-theme', next);
    } catch {
      /* almacenamiento no disponible */
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#f7f9fc' : '#0d1117');
    setTheme(next);
    window.setTimeout(() => root.classList.remove('theme-transition'), 320);
  };

  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? 'Activar tema oscuro' : 'Activar tema claro'}
      aria-pressed={isLight}
      title={isLight ? 'Tema oscuro' : 'Tema claro'}
      className="rounded-lg border border-zinc-700 p-2 text-zinc-300 transition-colors hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
    >
      <span className="relative flex h-5 w-5 items-center justify-center" aria-hidden="true">
        {/* Sol */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`absolute h-5 w-5 transition-all duration-300 ${isLight ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'}`}
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        {/* Luna */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`absolute h-5 w-5 transition-all duration-300 ${isLight ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}
        >
          <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z" />
        </svg>
      </span>
    </button>
  );
}
