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
  return new Date().toISOString().slice(0, 10)
}

export function weekStartDateString(): string {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return d.toISOString().slice(0, 10)
}

export async function fetchGlobalRecords(opts?: {
  date?: string  // YYYY-MM-DD: 해당 날짜 플레이어별 최고기록
  from?: string  // YYYY-MM-DD: 이 날짜 이후 날짜별·플레이어별 최고기록
}): Promise<GlobalRecord[]> {
  if (!API_URL) return []
  try {
    const params = new URLSearchParams()
    if (opts?.date) params.set('date', opts.date)
    if (opts?.from) params.set('from', opts.from)
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
): Promise<'saved' | 'skipped' | 'fail'> {
  if (!API_URL) return 'fail'
  try {
    const res = await fetch(`${API_URL}/api/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName, dealNumber, time, moves }),
    })
    if (res.status === 201) return 'saved'
    if (res.status === 200) return 'skipped'
    return 'fail'
  } catch {
    return 'fail'
  }
}

const NICKNAME_KEY = 'freecell-nickname'

export function getNickname(): string {
  return localStorage.getItem(NICKNAME_KEY) ?? ''
}

export function saveNickname(name: string): void {
  localStorage.setItem(NICKNAME_KEY, name.trim())
}
