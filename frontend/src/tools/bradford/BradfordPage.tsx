import {
  Badge, Button, Card, Divider, Field, Input, Select, Spinner, Text, Title2, tokens,
} from '@fluentui/react-components'
import {
  ArrowReset20Regular, Beaker24Regular, CheckmarkCircle20Filled, DocumentArrowUp20Regular,
  Info20Regular, Play20Filled, Print20Regular, Table20Regular,
} from '@fluentui/react-icons'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { analyzeBradford } from './calculations/bradford'
import { AssignmentPanel } from './components/AssignmentPanel'
import { CurveChart } from './components/CurveChart'
import { PlateGrid } from './components/PlateGrid'
import { ResultsTable } from './components/ResultsTable'
import { SavedRuns } from './components/SavedRuns'
import { ReportView } from './components/ReportView'
import { createExample } from './example'
import { detectAssayLayout, type AssayDetection } from './calculations/autodetect'
import { autoDetectWorkbookPlate, parsePlate, readWorkbook, type WorkbookData } from './spreadsheet/parseWorkbook'
import {
  createStoredRunId, dataUrlToFile, deleteStoredBradfordRun, fileToDataUrl, getStoredBradfordRun,
  listStoredBradfordRuns, saveStoredBradfordRun, type StoredBradfordMetadata,
} from './storage/localLibrary'
import type { Plate, WellDefinition, WellDefinitions } from './types'

function countRoles(definitions: WellDefinitions) {
  return Object.values(definitions).reduce((counts, item) => {
    counts[item.role] = (counts[item.role] ?? 0) + 1
    return counts
  }, {} as Record<string, number>)
}

export function BradfordPage() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [workbookData, setWorkbookData] = useState<WorkbookData>()
  const [sheetName, setSheetName] = useState('')
  const [origin, setOrigin] = useState('A1')
  const [plate, setPlate] = useState<Plate>()
  const [definitions, setDefinitions] = useState<WellDefinitions>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [detection, setDetection] = useState<AssayDetection>()
  const [savedRuns, setSavedRuns] = useState<StoredBradfordMetadata[]>(() => listStoredBradfordRuns())
  const [currentStoredId, setCurrentStoredId] = useState<string>()
  const [storedFileData, setStoredFileData] = useState<string>()
  const [storedFilename, setStoredFilename] = useState<string>()
  const [storedFileType, setStoredFileType] = useState('application/octet-stream')
  const [storedFileSize, setStoredFileSize] = useState(0)
  const [storageError, setStorageError] = useState<string>()
  const [showReport, setShowReport] = useState(false)

  const analysisState = useMemo(() => {
    if (!plate) return { analysis: undefined, error: undefined }
    try { return { analysis: analyzeBradford(plate, definitions), error: undefined } }
    catch (caught) { return { analysis: undefined, error: caught instanceof Error ? caught.message : 'Unable to analyze the plate.' } }
  }, [plate, definitions])
  const counts = countRoles(definitions)
  const selectedList = [...selected].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  const loadFile = async (file?: File) => {
    if (!file) return
    setLoading(true); setError(undefined); setStorageError(undefined)
    try {
      const [data, encodedFile] = await Promise.all([readWorkbook(file), fileToDataUrl(file)])
      setCurrentStoredId(createStoredRunId()); setStoredFileData(encodedFile); setStoredFilename(file.name)
      setStoredFileType(file.type || 'application/octet-stream'); setStoredFileSize(file.size)
      setWorkbookData(data); setSheetName(data.sheetNames[0]); setPlate(undefined); setDefinitions({}); setSelected(new Set()); setDetection(undefined)
      try {
        const found = await autoDetectWorkbookPlate(data)
        const layout = detectAssayLayout(found.plate)
        setSheetName(found.sheetName); setOrigin(found.origin); setPlate(found.plate); setDefinitions(layout.definitions); setDetection(layout)
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Automatic plate detection failed. Select the plate location manually.')
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not read the workbook.') }
    finally { setLoading(false) }
  }

  const extractPlate = async () => {
    if (!workbookData) return
    setLoading(true)
    try {
      const parsed = await parsePlate(workbookData, sheetName, origin)
      const layout = detectAssayLayout(parsed)
      setPlate(parsed); setDefinitions(layout.definitions); setDetection(layout); setSelected(new Set()); setError(undefined)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not parse the plate.') }
    finally { setLoading(false) }
  }

  const loadExample = useCallback(() => {
    const example = createExample()
    setPlate(example.plate); setDefinitions(example.definitions); setWorkbookData(undefined); setDetection(undefined); setSelected(new Set()); setError(undefined)
    setCurrentStoredId(undefined); setStoredFileData(undefined); setStoredFilename(undefined); setStoredFileSize(0); setStorageError(undefined)
  }, [])

  useEffect(() => {
    if (!document.modelContext?.registerTool) return
    const lifecycle = new AbortController()
    void Promise.resolve(document.modelContext.registerTool({
      name: 'load_bradford_example',
      title: 'Load Bradford example',
      description: 'Load the built-in Bradford assay example into the visible plate editor and calculate its standards curve and samples.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => {
        loadExample()
        return { status: 'loaded', standards: 8, blanks: 3, samples: 2 }
      },
    }, { signal: lifecycle.signal })).catch(() => undefined)
    return () => lifecycle.abort()
  }, [loadExample])

  const toggleWell = (well: string) => setSelected((current) => {
    const next = new Set(current)
    if (next.has(well)) next.delete(well); else next.add(well)
    return next
  })

  const applyDefinition = (definition: WellDefinition) => {
    setDefinitions((current) => {
      const next = { ...current }
      selected.forEach((well) => {
        if (definition.role === 'unused') delete next[well]
        else next[well] = { ...definition }
      })
      return next
    })
    setSelected(new Set())
  }

  const renameSample = (wells: string[], sampleName: string) => {
    setDefinitions((current) => {
      const next = { ...current }
      wells.forEach((well) => {
        const definition = next[well]
        if (definition?.role === 'sample') next[well] = { ...definition, sampleName }
      })
      return next
    })
  }

  const reset = () => {
    setWorkbookData(undefined); setSheetName(''); setOrigin('A1'); setPlate(undefined); setDefinitions({}); setDetection(undefined); setSelected(new Set()); setError(undefined)
    setCurrentStoredId(undefined); setStoredFileData(undefined); setStoredFilename(undefined); setStoredFileSize(0); setStorageError(undefined)
    if (fileInput.current) fileInput.current.value = ''
  }

  const openSavedRun = async (id: string) => {
    const run = getStoredBradfordRun(id)
    if (!run) { setStorageError('That saved analysis could not be read from this browser.'); return }
    setLoading(true); setError(undefined); setStorageError(undefined)
    setCurrentStoredId(run.id); setStoredFileData(run.fileDataUrl); setStoredFilename(run.filename)
    setStoredFileType(run.fileType); setStoredFileSize(run.fileSize); setSheetName(run.sheetName); setOrigin(run.origin)
    setPlate(run.plate); setDefinitions(run.definitions); setDetection(run.detection); setSelected(new Set())
    try {
      const file = await dataUrlToFile(run.fileDataUrl, run.filename, run.fileType)
      setWorkbookData(await readWorkbook(file))
    } catch { setWorkbookData(undefined) }
    finally { setLoading(false) }
  }

  const removeSavedRun = (id: string) => {
    const run = savedRuns.find((item) => item.id === id)
    if (!window.confirm(`Delete ${run?.filename ?? 'this saved analysis'} from this browser?`)) return
    deleteStoredBradfordRun(id)
    setSavedRuns(listStoredBradfordRuns())
    if (currentStoredId === id) reset()
  }

  useEffect(() => {
    if (!currentStoredId || !storedFileData || !storedFilename || !plate) return
    const timer = window.setTimeout(() => {
      try {
        saveStoredBradfordRun({
          id: currentStoredId, filename: storedFilename, fileType: storedFileType, fileDataUrl: storedFileData,
          fileSize: storedFileSize, savedAt: new Date().toISOString(), sheetName, origin, plate, definitions,
          detection, analysis: analysisState.analysis, sampleCount: analysisState.analysis?.samples.length ?? counts.sample ?? 0,
          hasResults: Boolean(analysisState.analysis),
        })
        setSavedRuns(listStoredBradfordRuns()); setStorageError(undefined)
      } catch (caught) {
        setStorageError(caught instanceof DOMException && caught.name === 'QuotaExceededError'
          ? 'This file is too large for browser local storage. Delete an older saved file or continue without persistence.'
          : 'The file and results could not be saved in this browser.')
      }
    }, 350)
    return () => window.clearTimeout(timer)
  }, [analysisState.analysis, counts.sample, currentStoredId, definitions, detection, origin, plate, sheetName, storedFileData, storedFilename, storedFileSize, storedFileType])

  return (
    <div className="bradford-page mx-auto max-w-[1500px] px-4 py-8 sm:px-7 sm:py-10">
      <section className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-800"><Beaker24Regular /> Protein analysis</div>
          <Title2 as="h1">Bradford assay</Title2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Import a 96-well plate, identify standards and samples, then fit the same quadratic curve used by the reference notebook.</p>
        </div>
        <div className="no-print flex gap-2">
          <Button appearance="subtle" icon={<ArrowReset20Regular />} onClick={reset}>Start over</Button>
          <Button appearance="secondary" icon={<Play20Filled />} onClick={loadExample}>Load example</Button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-6">
          <Card appearance="filled" className="!rounded-2xl !border !border-emerald-950/10 !bg-white !p-5 shadow-[0_10px_30px_rgba(20,60,48,0.05)] sm:!p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2"><DocumentArrowUp20Regular /><Text weight="semibold">1. Import and detect plate data</Text></div>
                <p className="text-xs leading-5 text-slate-500">Excel and CSV files are read locally. The app finds the plate, standards, blanks, and wells above the blank mean plus two standard deviations automatically.</p>
              </div>
              <input ref={fileInput} className="hidden" type="file" accept=".xlsx,.csv" onChange={(event) => loadFile(event.target.files?.[0])} />
              <Button appearance="primary" icon={<DocumentArrowUp20Regular />} onClick={() => fileInput.current?.click()}>{workbookData ? 'Choose another file' : 'Choose file'}</Button>
            </div>
            {loading && <div className="mt-4"><Spinner size="tiny" label="Reading workbook…" /></div>}
            <SavedRuns runs={savedRuns} currentId={currentStoredId} onOpen={openSavedRun} onDelete={removeSavedRun} />
            {workbookData && (
              <div className="mt-5 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_150px_auto] sm:items-end">
                <Field label="Worksheet"><Select value={sheetName} onChange={(_, data) => setSheetName(data.value)}>{workbookData.sheetNames.map((name) => <option key={name}>{name}</option>)}</Select></Field>
                <Field label="Cell containing A1"><Input value={origin} onChange={(_, data) => setOrigin(data.value.toUpperCase())} placeholder="B2" /></Field>
                <Button icon={<Table20Regular />} onClick={extractPlate}>Read and auto-assign</Button>
                <div className="text-xs text-slate-500 sm:col-span-3">{workbookData.name}</div>
              </div>
            )}
            {detection && <div className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${detection.confidence === 'low' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
              <CheckmarkCircle20Filled className="mt-0.5 shrink-0" />
              <div><strong>Automatic setup {detection.confidence === 'low' ? 'needs review' : 'complete'}.</strong> {detection.message}</div>
            </div>}
            {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
            {storageError && <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{storageError}</div>}
          </Card>

          {plate ? (
            <Card appearance="filled" className="!rounded-2xl !border !border-emerald-950/10 !bg-white !p-5 shadow-[0_10px_30px_rgba(20,60,48,0.05)] sm:!p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div><Text weight="semibold" size={500}>2. Define the plate</Text><p className="mt-1 text-xs text-slate-500">Select wells, then assign their role from the panel.</p></div>
                <div className="flex flex-wrap gap-2">
                  <Badge appearance="tint" color="brand">{counts.standard ?? 0} standards</Badge>
                  <Badge appearance="tint">{counts.blank ?? 0} blanks</Badge>
                  <Badge appearance="tint" color="warning">{counts.sample ?? 0} samples</Badge>
                </div>
              </div>
              <PlateGrid plate={plate} definitions={definitions} selected={selected} onToggle={toggleWell} />
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />Standard</span>
                <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-slate-500" />Blank</span>
                <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-amber-700" />Sample</span>
              </div>
            </Card>
          ) : (
            <div className="rounded-2xl border border-dashed border-emerald-900/20 bg-white/50 px-6 py-14 text-center">
              <Table20Regular fontSize={32} color={tokens.colorBrandForeground1} />
              <h2 className="mt-3 text-base font-semibold">Your plate will appear here</h2>
              <p className="mt-1 text-sm text-slate-500">Choose a workbook above or load the included notebook-style example.</p>
            </div>
          )}

          {analysisState.analysis && (
            <Card appearance="filled" className="!rounded-2xl !border !border-emerald-950/10 !bg-white !p-5 shadow-[0_10px_30px_rgba(20,60,48,0.05)] sm:!p-6">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div><Text weight="semibold" size={500}>3. Review the curve</Text><p className="mt-1 text-xs text-slate-500">Quadratic concentration-on-absorbance fit after subtracting the mean blank.</p></div>
                <div className="flex items-center gap-2">
                  <Badge appearance="tint" color={analysisState.analysis.fit.r2 >= 0.98 ? 'success' : 'warning'} icon={<CheckmarkCircle20Filled />}>R² {analysisState.analysis.fit.r2.toFixed(4)}</Badge>
                  <Button icon={<Print20Regular />} onClick={() => setShowReport(true)}>Report / PDF</Button>
                </div>
              </div>
              <CurveChart analysis={analysisState.analysis} />
              <Divider className="!my-5" />
              <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Mean blank" value={analysisState.analysis.blank.toFixed(4)} />
                <Metric label="Standards" value={String(analysisState.analysis.standards.length)} />
                <Metric label="Samples" value={String(analysisState.analysis.samples.length)} />
                <Metric label="Equation" value={formatEquation(analysisState.analysis.fit.coefficients)} compact />
              </div>
              <ResultsTable analysis={analysisState.analysis} onRenameSample={renameSample} />
            </Card>
          )}
        </div>

        <div className="no-print xl:sticky xl:top-24 xl:self-start">
          {plate ? <AssignmentPanel selected={selectedList} firstDefinition={selectedList.length === 1 ? definitions[selectedList[0]] : undefined} onApply={applyDefinition} onClearSelection={() => setSelected(new Set())} /> : (
            <aside className="rounded-2xl border border-emerald-950/10 bg-white p-5">
              <div className="flex items-center gap-2 text-emerald-800"><Info20Regular /><Text weight="semibold">Workflow</Text></div>
              <ol className="mt-4 space-y-4 text-sm text-slate-600">
                <li className="flex gap-3"><Step number="1" /> Import and preview the plate.</li>
                <li className="flex gap-3"><Step number="2" /> Assign standards, blanks, and samples.</li>
                <li className="flex gap-3"><Step number="3" /> Review the fit and export results.</li>
              </ol>
            </aside>
          )}
          {plate && !analysisState.analysis && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-900"><strong>Analysis not ready.</strong><br />{analysisState.error}</div>}
        </div>
      </div>
      {showReport && plate && analysisState.analysis && <ReportView analysis={analysisState.analysis} plate={plate} definitions={definitions} filename={storedFilename ?? workbookData?.name} onClose={() => setShowReport(false)} />}
    </div>
  )
}

function Step({ number }: { number: string }) { return <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-900">{number}</span> }

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return <div className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div><div className={`mt-1 font-semibold text-slate-900 ${compact ? 'text-xs leading-5' : 'text-lg tabular-nums'}`}>{value}</div></div>
}

function formatEquation([a, b, c]: [number, number, number]) {
  return `y = ${a.toFixed(2)}x² ${b >= 0 ? '+' : '−'} ${Math.abs(b).toFixed(2)}x ${c >= 0 ? '+' : '−'} ${Math.abs(c).toFixed(2)}`
}
