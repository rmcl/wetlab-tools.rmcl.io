import { Button } from '@fluentui/react-components'
import { Dismiss20Regular, Print20Regular } from '@fluentui/react-icons'
import { useEffect } from 'react'
import type { AnalysisResult, Plate, WellDefinitions } from '../types'
import { CurveChart } from './CurveChart'

const rows = 'ABCDEFGH'.split('')

export function ReportView({ analysis, plate, definitions, filename, onClose }: {
  analysis: AnalysisResult
  plate: Plate
  definitions: WellDefinitions
  filename?: string
  onClose: () => void
}) {
  useEffect(() => {
    document.body.classList.add('report-open')
    return () => document.body.classList.remove('report-open')
  }, [])
  const [a, b, c] = analysis.fit.coefficients
  return (
    <div className="report-view fixed inset-0 z-50 overflow-y-auto bg-[#eef2f0] p-4 sm:p-8">
      <div className="report-controls no-print sticky top-0 z-10 mx-auto mb-4 flex max-w-[1120px] justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur">
        <Button icon={<Dismiss20Regular />} onClick={onClose}>Close</Button>
        <Button appearance="primary" icon={<Print20Regular />} onClick={() => window.print()}>Print / Save PDF</Button>
      </div>
      <article className="report-sheet mx-auto max-w-[1120px] bg-white px-8 py-8 shadow-xl sm:px-12">
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-800">Protein analysis</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Bradford Assay Report</h1></div>
          <div className="text-right text-xs leading-5 text-slate-500"><div>{filename ?? 'Unsaved analysis'}</div><div>{new Date().toLocaleString()}</div></div>
        </header>

        <section className="report-section mt-7">
          <div className="mb-3 flex items-end justify-between"><h2 className="text-xl font-semibold text-slate-950">Sample results</h2><span className="text-xs text-slate-500">{analysis.samples.length} samples</span></div>
          <div className="overflow-hidden rounded-lg border border-slate-300">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-100 text-slate-700"><tr><th className="p-2.5">Sample</th><th className="p-2.5">Wells</th><th className="p-2.5">Absorbance</th><th className="p-2.5">µg/mL</th><th className="p-2.5">MW</th><th className="p-2.5">µM</th></tr></thead>
              <tbody>{analysis.samples.map((sample) => <tr key={sample.name} className="border-t border-slate-200"><td className="p-2.5 font-semibold">{sample.name}{sample.outsideRange ? ' *' : ''}</td><td className="p-2.5">{sample.wells.join(', ')}</td><td className="p-2.5 tabular-nums">{sample.absorbance.toFixed(3)}</td><td className="p-2.5 font-semibold tabular-nums">{sample.concentration.toFixed(2)}</td><td className="p-2.5">{sample.molecularWeight ? `${sample.molecularWeight} kDa` : '—'}</td><td className="p-2.5 tabular-nums">{sample.micromolar?.toFixed(2) ?? '—'}</td></tr>)}</tbody>
            </table>
          </div>
          {analysis.samples.some((sample) => sample.outsideRange) && <p className="mt-2 text-[11px] text-slate-500">* Sample absorbance falls outside the standards range and requires extrapolation.</p>}
        </section>

        <section className="report-section mt-8 break-inside-avoid">
          <h2 className="text-xl font-semibold text-slate-950">Standards curve</h2>
          <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
            <ReportMetric label="Blank mean" value={analysis.blank.toFixed(4)} />
            <ReportMetric label="R²" value={analysis.fit.r2.toFixed(4)} />
            <ReportMetric label="Standards" value={String(analysis.standards.length)} />
            <ReportMetric label="Equation" value={`y=${a.toFixed(2)}x²${b >= 0 ? '+' : ''}${b.toFixed(2)}x${c >= 0 ? '+' : ''}${c.toFixed(2)}`} />
          </div>
          <CurveChart analysis={analysis} report />
        </section>

        <section className="report-section mt-8 break-inside-avoid">
          <h2 className="mb-3 text-xl font-semibold text-slate-950">Plate absorbances</h2>
          <table className="plate-report-table w-full table-fixed border-collapse text-center text-[10px]">
            <thead><tr><th className="border border-slate-300 bg-slate-100 p-1" />{Array.from({ length: 12 }, (_, col) => <th key={col} className="border border-slate-300 bg-slate-100 p-1">{col + 1}</th>)}</tr></thead>
            <tbody>{plate.map((values, row) => <tr key={rows[row]}><th className="border border-slate-300 bg-slate-100 p-1">{rows[row]}</th>{values.map((value, col) => {
              const well = `${rows[row]}${col + 1}`
              const role = definitions[well]?.role
              return <td key={well} className={`border border-slate-300 p-1.5 tabular-nums ${role === 'standard' ? 'bg-blue-50' : role === 'blank' ? 'bg-slate-100' : role === 'sample' ? 'bg-amber-50' : ''}`}><span className="block text-[8px] font-semibold text-slate-500">{well}</span>{value.toFixed(3)}</td>
            })}</tr>)}</tbody>
          </table>
          <div className="mt-3 flex gap-5 text-[10px] text-slate-600"><span>■ <i className="text-blue-200">Standard</i></span><span>■ <i className="text-slate-300">Blank</i></span><span>■ <i className="text-amber-200">Sample</i></span></div>
        </section>
      </article>
    </div>
  )
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-2.5"><div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 break-words font-semibold text-slate-900">{value}</div></div>
}
