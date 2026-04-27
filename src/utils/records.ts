const STORAGE_KEY = 'freecell-records'

export interface GameRecord {
  dealNumber: number
  time: number   // seconds (best)
  moves: number  // moves at best time
  date: string   // ISO date
}

function load(): GameRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as GameRecord[]) : []
  } catch {
    return []
  }
}

function save(records: GameRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

/** 게임 클리어 시 최단 시간 기준으로 기록 갱신 */
export function updateRecord(dealNumber: number, time: number, moves: number): void {
  const records = load()
  const existing = records.find(r => r.dealNumber === dealNumber)
  if (!existing || time < existing.time) {
    const rest = records.filter(r => r.dealNumber !== dealNumber)
    rest.push({ dealNumber, time, moves, date: new Date().toISOString() })
    save(rest)
  }
}

/** 전체 기록을 시간 오름차순(빠른 순)으로 반환 */
export function getRecords(): GameRecord[] {
  return load().sort((a, b) => a.time - b.time)
}

export function clearRecords(): void {
  localStorage.removeItem(STORAGE_KEY)
}
