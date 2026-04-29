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

// 로컬 N일 전 자정 → UTC ISO
export function localDayStart(daysAgo = 0): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysAgo).toISOString()
}

// 로컬 오늘 끝 (23:59:59) → UTC ISO
export function localDayEnd(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString()
}

export async function fetchGlobalRecords(opts?: {
  from?: string  // UTC ISO timestamp: 이 시각 이후
  to?: string    // UTC ISO timestamp: 이 시각 이전
}): Promise<GlobalRecord[]> {
  if (!API_URL) return []
  try {
    const params = new URLSearchParams()
    if (opts?.from) params.set('from', opts.from)
    if (opts?.to)   params.set('to', opts.to)
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
