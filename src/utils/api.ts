const API_URL = import.meta.env.VITE_API_URL ?? ''

export interface GlobalRecord {
  id: number
  playerName: string
  dealNumber: number
  time: number
  moves: number
  date: string
  rank: number
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
}

export async function fetchGlobalRecords(opts?: {
  dealNumber?: number
  date?: string // YYYY-MM-DD; if provided, returns daily best-per-player
}): Promise<GlobalRecord[]> {
  if (!API_URL) return []
  try {
    const params = new URLSearchParams()
    if (opts?.dealNumber) params.set('dealNumber', String(opts.dealNumber))
    if (opts?.date) params.set('date', opts.date)
    const url = `${API_URL}/api/records${params.size ? '?' + params.toString() : ''}`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return (data.records ?? []).map((r: GlobalRecord, i: number) => ({ ...r, rank: i + 1 }))
  } catch {
    return []
  }
}

export async function submitGlobalRecord(
  playerName: string,
  dealNumber: number,
  time: number,
  moves: number,
): Promise<boolean> {
  if (!API_URL) return false
  try {
    const res = await fetch(`${API_URL}/api/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName, dealNumber, time, moves }),
    })
    return res.status === 201
  } catch {
    return false
  }
}

const NICKNAME_KEY = 'freecell-nickname'

export function getNickname(): string {
  return localStorage.getItem(NICKNAME_KEY) ?? ''
}

export function saveNickname(name: string): void {
  localStorage.setItem(NICKNAME_KEY, name.trim())
}
