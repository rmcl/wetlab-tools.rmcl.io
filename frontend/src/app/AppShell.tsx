import { Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div className="app-background min-h-screen">
      <main><Outlet /></main>
      <footer className="mx-auto max-w-[1500px] px-6 py-8 text-center text-xs text-slate-500">
        Files are processed locally and saved only in this browser. Nothing is uploaded.
      </footer>
    </div>
  )
}
