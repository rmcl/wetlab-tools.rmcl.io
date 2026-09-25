import { Button, Field, Input, Radio, RadioGroup, Text } from '@fluentui/react-components'
import { Eraser20Regular } from '@fluentui/react-icons'
import { useEffect, useState } from 'react'
import type { WellDefinition, WellRole } from '../types'

export function AssignmentPanel({ selected, firstDefinition, onApply, onClearSelection }: {
  selected: string[]
  firstDefinition?: WellDefinition
  onApply: (definition: WellDefinition) => void
  onClearSelection: () => void
}) {
  const [role, setRole] = useState<WellRole>('standard')
  const [concentration, setConcentration] = useState('')
  const [sampleName, setSampleName] = useState('')
  const [molecularWeight, setMolecularWeight] = useState('')

  useEffect(() => {
    if (!firstDefinition) return
    setRole(firstDefinition.role)
    setConcentration(firstDefinition.concentration?.toString() ?? '')
    setSampleName(firstDefinition.sampleName ?? '')
    setMolecularWeight(firstDefinition.molecularWeight?.toString() ?? '')
  }, [firstDefinition])

  const apply = () => {
    if (role === 'standard') onApply({ role, concentration: Number(concentration) })
    else if (role === 'sample') onApply({ role, sampleName: sampleName.trim(), molecularWeight: molecularWeight ? Number(molecularWeight) : undefined })
    else onApply({ role })
  }

  return (
    <aside className="rounded-2xl border border-emerald-950/10 bg-[#f8faf9] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Text weight="semibold" size={400}>Assign selected wells</Text>
          <p className="mt-1 text-xs text-slate-500">{selected.length ? selected.join(', ') : 'Select one or more wells on the plate.'}</p>
        </div>
        <Button appearance="subtle" size="small" icon={<Eraser20Regular />} onClick={onClearSelection} disabled={!selected.length}>Clear</Button>
      </div>
      <RadioGroup className="mt-4" value={role} onChange={(_, data) => setRole(data.value as WellRole)} layout="horizontal">
        <Radio value="standard" label="Standard" />
        <Radio value="blank" label="Blank" />
        <Radio value="sample" label="Sample" />
        <Radio value="unused" label="Unused" />
      </RadioGroup>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {role === 'standard' && (
          <Field label="Concentration" hint="µg/mL" required validationMessage={concentration && !Number.isFinite(Number(concentration)) ? 'Enter a number.' : undefined}>
            <Input type="number" min="0" value={concentration} onChange={(_, data) => setConcentration(data.value)} />
          </Field>
        )}
        {role === 'sample' && <>
          <Field label="Sample name" required><Input value={sampleName} onChange={(_, data) => setSampleName(data.value)} placeholder="e.g. RM2-A" /></Field>
          <Field label="Molecular weight" hint="kDa; optional"><Input type="number" min="0" value={molecularWeight} onChange={(_, data) => setMolecularWeight(data.value)} /></Field>
        </>}
      </div>
      <Button className="!mt-5 !w-full" appearance="primary" disabled={!selected.length || (role === 'standard' && !Number.isFinite(Number(concentration))) || (role === 'sample' && !sampleName.trim())} onClick={apply}>
        Apply to {selected.length || 0} {selected.length === 1 ? 'well' : 'wells'}
      </Button>
    </aside>
  )
}

