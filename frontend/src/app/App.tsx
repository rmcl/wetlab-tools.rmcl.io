import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { ToolIndexPage } from '../pages/ToolIndexPage'

const BradfordPage = lazy(() => import('../tools/bradford/BradfordPage').then((module) => ({ default: module.BradfordPage })))

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<ToolIndexPage />} />
        <Route path="bradford" element={<Suspense fallback={<div className="grid min-h-[60vh] place-items-center text-sm text-slate-500">Loading Bradford assay…</div>}><BradfordPage /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
