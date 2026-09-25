import { Badge, Button, Input, Table, TableBody, TableCell, TableCellLayout, TableHeader, TableHeaderCell, TableRow, Tooltip } from '@fluentui/react-components'
import { ArrowDownload20Regular, Checkmark16Regular, Dismiss16Regular, Edit16Regular, Warning16Regular } from '@fluentui/react-icons'
import { useState } from 'react'
import type { AnalysisResult } from '../types'

function escapeCsv(value: string | number | undefined) {
  if (value === undefined) return ''
  const text = String(value)
  return /[\n,"]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function ResultsTable({ analysis, onRenameSample }: { analysis: AnalysisResult; onRenameSample: (wells: string[], name: string) => void }) {
  const [editingName, setEditingName] = useState<string>()
  const [draftName, setDraftName] = useState('')
  const startEditing = (name: string) => { setEditingName(name); setDraftName(name) }
  const cancelEditing = () => { setEditingName(undefined); setDraftName('') }
  const saveName = (wells: string[]) => {
    const name = draftName.trim()
    if (!name) return
    onRenameSample(wells, name)
    cancelEditing()
  }
  const download = () => {
    const rows = [
      ['Sample', 'Wells', 'Absorbance', 'Concentration (ug/mL)', 'Molecular weight (kDa)', 'Concentration (uM)', 'Outside standards range'],
      ...analysis.samples.map((s) => [s.name, s.wells.join(' '), s.absorbance.toFixed(6), s.concentration.toFixed(6), s.molecularWeight, s.micromolar?.toFixed(6), s.outsideRange ? 'Yes' : 'No']),
    ]
    const blob = new Blob([rows.map((row) => row.map(escapeCsv).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob); link.download = 'bradford-results.csv'; link.click(); URL.revokeObjectURL(link.href)
  }
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Sample results</h3>
        <Button size="small" icon={<ArrowDownload20Regular />} onClick={download} disabled={!analysis.samples.length}>Export CSV</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <Table aria-label="Bradford sample results" size="small">
          <TableHeader><TableRow>
            <TableHeaderCell>Sample</TableHeaderCell><TableHeaderCell>Wells</TableHeaderCell><TableHeaderCell>Absorbance</TableHeaderCell>
            <TableHeaderCell>µg/mL</TableHeaderCell><TableHeaderCell>MW</TableHeaderCell><TableHeaderCell>µM</TableHeaderCell>
          </TableRow></TableHeader>
          <TableBody>
            {analysis.samples.map((sample) => (
              <TableRow key={sample.name}>
                <TableCell>
                  {editingName === sample.name ? (
                    <div className="flex min-w-[180px] items-center gap-1">
                      <Input
                        autoFocus size="small" value={draftName} onChange={(_, data) => setDraftName(data.value)}
                        aria-label={`Edit sample name for ${sample.name}`}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') saveName(sample.wells)
                          if (event.key === 'Escape') cancelEditing()
                        }}
                      />
                      <Tooltip content="Save name" relationship="label"><Button size="small" appearance="subtle" icon={<Checkmark16Regular />} aria-label="Save sample name" disabled={!draftName.trim()} onClick={() => saveName(sample.wells)} /></Tooltip>
                      <Tooltip content="Cancel" relationship="label"><Button size="small" appearance="subtle" icon={<Dismiss16Regular />} aria-label="Cancel editing sample name" onClick={cancelEditing} /></Tooltip>
                    </div>
                  ) : (
                    <TableCellLayout>
                      <span>{sample.name}</span>
                      {sample.outsideRange && <Tooltip content="Outside the standards’ absorbance range" relationship="label"><Warning16Regular className="ml-1 text-amber-700" /></Tooltip>}
                      <Tooltip content="Edit sample name" relationship="label">
                        <Button size="small" appearance="transparent" icon={<Edit16Regular />} aria-label={`Edit sample name ${sample.name}`} onClick={() => startEditing(sample.name)} />
                      </Tooltip>
                    </TableCellLayout>
                  )}
                </TableCell>
                <TableCell>{sample.wells.join(', ')}</TableCell><TableCell>{sample.absorbance.toFixed(3)}</TableCell>
                <TableCell><strong>{sample.concentration.toFixed(2)}</strong></TableCell>
                <TableCell>{sample.molecularWeight ? `${sample.molecularWeight} kDa` : '—'}</TableCell>
                <TableCell>{sample.micromolar !== undefined ? sample.micromolar.toFixed(2) : '—'}</TableCell>
              </TableRow>
            ))}
            {!analysis.samples.length && <TableRow><TableCell colSpan={6}><div className="py-5 text-center text-slate-500">Assign sample wells to calculate concentrations.</div></TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      {analysis.samples.some((sample) => sample.outsideRange) && <Badge className="!mt-3" appearance="tint" color="warning" icon={<Warning16Regular />}>One or more samples require extrapolation.</Badge>}
    </div>
  )
}
