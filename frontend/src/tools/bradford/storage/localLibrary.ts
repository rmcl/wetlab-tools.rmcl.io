import type { AssayDetection } from '../calculations/autodetect'
import type { AnalysisResult, Plate, WellDefinitions } from '../types'

const INDEX_KEY = 'rmcl-tools:bradford:index:v1'
const ENTRY_PREFIX = 'rmcl-tools:bradford:entry:v1:'

export interface StoredBradfordMetadata {
  id: string
  filename: string
  savedAt: string
  fileSize: number
  sampleCount: number
  hasResults: boolean
}

export interface StoredBradfordRun extends StoredBradfordMetadata {
  fileType: string
  fileDataUrl: string
  sheetName: string
  origin: string
  plate: Plate
  definitions: WellDefinitions
  detection?: AssayDetection
  analysis?: AnalysisResult
}

function browserStorage(): Storage | undefined {
  try { return typeof window === 'undefined' ? undefined : window.localStorage }
  catch { return undefined }
}

export function createStoredRunId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `bradford-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function listStoredBradfordRuns(storage = browserStorage()): StoredBradfordMetadata[] {
  if (!storage) return []
  try {
    const parsed = JSON.parse(storage.getItem(INDEX_KEY) ?? '[]') as StoredBradfordMetadata[]
    return parsed.filter((item) => storage.getItem(`${ENTRY_PREFIX}${item.id}`)).sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  } catch { return [] }
}

export function getStoredBradfordRun(id: string, storage = browserStorage()): StoredBradfordRun | undefined {
  if (!storage) return undefined
  try {
    const value = storage.getItem(`${ENTRY_PREFIX}${id}`)
    return value ? JSON.parse(value) as StoredBradfordRun : undefined
  } catch { return undefined }
}

export function saveStoredBradfordRun(run: StoredBradfordRun, storage = browserStorage()) {
  if (!storage) throw new Error('Browser local storage is unavailable.')
  const metadata: StoredBradfordMetadata = {
    id: run.id, filename: run.filename, savedAt: run.savedAt, fileSize: run.fileSize,
    sampleCount: run.sampleCount, hasResults: run.hasResults,
  }
  storage.setItem(`${ENTRY_PREFIX}${run.id}`, JSON.stringify(run))
  const index = listStoredBradfordRuns(storage).filter((item) => item.id !== run.id)
  index.unshift(metadata)
  storage.setItem(INDEX_KEY, JSON.stringify(index))
}

export function deleteStoredBradfordRun(id: string, storage = browserStorage()) {
  if (!storage) return
  storage.removeItem(`${ENTRY_PREFIX}${id}`)
  storage.setItem(INDEX_KEY, JSON.stringify(listStoredBradfordRuns(storage).filter((item) => item.id !== id)))
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not store the spreadsheet.'))
    reader.readAsDataURL(file)
  })
}

export async function dataUrlToFile(dataUrl: string, filename: string, type: string): Promise<File> {
  const response = await fetch(dataUrl)
  return new File([await response.blob()], filename, { type })
}

