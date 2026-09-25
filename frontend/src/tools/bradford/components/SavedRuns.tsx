import { Badge, Button, Text, Tooltip } from '@fluentui/react-components'
import { Delete20Regular, FolderOpen20Regular, History20Regular } from '@fluentui/react-icons'
import type { StoredBradfordMetadata } from '../storage/localLibrary'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function SavedRuns({ runs, currentId, onOpen, onDelete }: {
  runs: StoredBradfordMetadata[]
  currentId?: string
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}) {
  if (!runs.length) return (
    <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-center text-sm text-slate-500">
      Uploaded files and results will appear here after the first analysis.
    </div>
  )
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center gap-2 text-slate-700"><History20Regular /><Text weight="semibold">Saved in this browser</Text></div>
      <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
        {runs.map((run) => (
          <div key={run.id} className={`flex flex-col gap-3 bg-white px-4 py-3 sm:flex-row sm:items-center ${currentId === run.id ? 'ring-2 ring-inset ring-emerald-600' : ''}`}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-semibold text-slate-900">{run.filename}</span>
                {currentId === run.id && <Badge appearance="tint" color="success">Open</Badge>}
                {run.hasResults && <Badge appearance="outline" color="brand">Results saved</Badge>}
              </div>
              <div className="mt-1 text-xs text-slate-500">{formatDate(run.savedAt)} · {formatBytes(run.fileSize)} · {run.sampleCount} samples</div>
            </div>
            <div className="flex gap-2">
              <Button size="small" icon={<FolderOpen20Regular />} onClick={() => onOpen(run.id)}>Open</Button>
              <Tooltip content="Delete this locally saved file and its results" relationship="label">
                <Button size="small" appearance="subtle" icon={<Delete20Regular />} aria-label={`Delete ${run.filename}`} onClick={() => onDelete(run.id)} />
              </Tooltip>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
