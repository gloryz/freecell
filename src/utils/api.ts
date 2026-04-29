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

// 해당 날짜가 속한 주의 월요일 (로컬 시간 기준)
function getMondayOf(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = copy.getDay() // 0=일, 1=월, ..., 6=토
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day))
  return copy
}

// weekOffset=0: 이번 주 월요일, -1: 지난 주 월요일, ...
export function localWeekStart(weekOffset = 0): string {
  const m = getMondayOf(new Date())
  m.setDate(m.getDate() + weekOffset * 7)
  return m.toISOString()
}

export function localWeekEnd(weekOffset = 0): string {
  const m = getMondayOf(new Date())
  m.setDate(m.getDate() + weekOffset * 7 + 6)
  return new Date(m.getFullYear(), m.getMonth(), m.getDate(), 23, 59, 59, 999).toISOString()
}

export interface WeekInfo {
  label: string  // "2026년 18주차"
  range: string  // "4/28 ~ 5/4"
  year: number
  week: number
}

export function getWeekInfo(weekOffset = 0): WeekInfo {
  const m = getMondayOf(new Date())
  m.setDate(m.getDate() + weekOffset * 7)
  const sun = new Date(m)
  sun.setDate(sun.getDate() + 6)

  // ISO 주차: 해당 주의 목요일 기준 연도·주번호 계산
  const thu = new Date(Date.UTC(m.getFullYear(), m.getMonth(), m.getDate() + 3))
  const yearStart = new Date(Date.UTC(thu.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((thu.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  const year = thu.getUTCFullYear()

  const fmt = (d: Date) => d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
  return { label: `${year}년 ${week}주차`, range: `${fmt(m)} ~ ${fmt(sun)}`, year, week }
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
