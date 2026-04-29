import { useState, useEffect } from 'react'
import { getRecords, clearRecords } from '../utils/records'
import { fetchGlobalRecords, localDayStart, localDayEnd, localWeekStart, localWeekEnd, getWeekInfo, GlobalRecord } from '../utils/api'
import './RecordsModal.css'

interface RecordsModalProps {
  onClose: () => void
  currentDealNumber?: number
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

type Tab = 'local' | 'global'
type Period = 'today' | 'week' | 'all'

export default function RecordsModal({ onClose }: RecordsModalProps) {
  const [tab, setTab] = useState<Tab>('global')
  const [records, setRecords] = useState(getRecords)
  const [globalRecords, setGlobalRecords] = useState<GlobalRecord[]>([])
  const [globalLoading, setGlobalLoading] = useState(false)
  const [globalError, setGlobalError] = useState(false)
  const [period, setPeriod] = useState<Period>('week')
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    if (tab !== 'global') return
    setGlobalLoading(true)
    setGlobalError(false)
    fetchGlobalRecords({
      from: period === 'today' ? localDayStart(0) : period === 'week' ? localWeekStart(weekOffset) : undefined,
      to:   period === 'today' ? localDayEnd()     : period === 'week' ? localWeekEnd(weekOffset)   : undefined,
    })
      .then(data => { setGlobalRecords(data) })
      .catch(() => setGlobalError(true))
      .finally(() => setGlobalLoading(false))
  }, [tab, period, weekOffset])

  function handleClear() {
    if (!confirm('모든 기록을 삭제할까요?')) return
    clearRecords()
    setRecords([])
  }

  const weekInfo = getWeekInfo(weekOffset)

  const periodSubtitle =
    period === 'today' ? `${new Date().toLocaleDateString('ko-KR')} 최고 기록 (플레이어별 1위)`
    : period === 'week' ? `${weekInfo.label} (${weekInfo.range})`
    : '전체 기간 · 날짜별 플레이어 최고기록'

  const showDate = period !== 'today'

  return (
    <div className="win-overlay" onClick={onClose}>
      <div className="records-modal" onClick={e => e.stopPropagation()}>
        <h2>Records</h2>

        {/* Main tabs */}
        <div className="records-tabs">
          <button
            className={`records-tab${tab === 'global' ? ' active' : ''}`}
            onClick={() => setTab('global')}
          >🌐 글로벌</button>
          <button
            className={`records-tab${tab === 'local' ? ' active' : ''}`}
            onClick={() => setTab('local')}
          >내 기록</button>
        </div>

        {/* Local tab */}
        {tab === 'local' && (
          <>
            {records.length === 0 ? (
              <p className="records-empty">아직 기록이 없습니다. 게임을 클리어해 보세요!</p>
            ) : (
              <div className="records-table-wrap">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>순위</th>
                      <th>딜 번호</th>
                      <th>시간</th>
                      <th>이동 수</th>
                      <th>날짜</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(0, 30).map((r, i) => (
                      <tr key={r.dealNumber}>
                        <td className="records-rank">{i + 1}</td>
                        <td className="records-deal">#{r.dealNumber}</td>
                        <td className="records-time">{formatTime(r.time)}</td>
                        <td>{r.moves}</td>
                        <td className="records-date">
                          {new Date(r.date).toLocaleDateString('ko-KR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="records-footer">
              {records.length > 0 && (
                <button className="btn btn-clear" onClick={handleClear}>기록 초기화</button>
              )}
              <button className="btn" onClick={onClose}>닫기</button>
            </div>
          </>
        )}

        {/* Global tab */}
        {tab === 'global' && (
          <>
            <div className="global-controls">
              <div className="period-tabs">
                <button
                  className={`period-tab${period === 'today' ? ' active' : ''}`}
                  onClick={() => setPeriod('today')}
                >오늘</button>
                <button
                  className={`period-tab${period === 'week' ? ' active' : ''}`}
                  onClick={() => setPeriod('week')}
                >시즌</button>
                <button
                  className={`period-tab${period === 'all' ? ' active' : ''}`}
                  onClick={() => setPeriod('all')}
                >전체</button>
              </div>

              {period === 'week' && (
                <div className="week-nav">
                  <button className="week-nav-btn" onClick={() => setWeekOffset(w => w - 1)}>‹</button>
                  <span className="week-nav-label">{weekInfo.label}</span>
                  <button
                    className="week-nav-btn"
                    onClick={() => setWeekOffset(w => w + 1)}
                    disabled={weekOffset >= 0}
                  >›</button>
                </div>
              )}
            </div>

            <p className="period-subtitle">{periodSubtitle}</p>

            {globalLoading && (
              <p className="records-empty">불러오는 중…</p>
            )}
            {!globalLoading && globalError && (
              <p className="records-empty">서버에 연결할 수 없습니다.</p>
            )}
            {!globalLoading && !globalError && globalRecords.length === 0 && (
              <p className="records-empty">
                {period === 'today' ? '오늘 아직 기록이 없습니다.' : '기록이 없습니다.'}
              </p>
            )}
            {!globalLoading && !globalError && globalRecords.length > 0 && (
              <div className="records-table-wrap">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>순위</th>
                      <th>닉네임</th>
                      <th>딜 번호</th>
                      <th>시간</th>
                      <th>이동 수</th>
                      {showDate && <th>날짜</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {globalRecords.map(r => (
                      <tr key={r.id}>
                        <td className="records-rank">{r.rank}</td>
                        <td className="records-player">{r.playerName}</td>
                        <td className="records-deal">#{r.dealNumber}</td>
                        <td className="records-time">{formatTime(r.time)}</td>
                        <td>{r.moves}</td>
                        {showDate && (
                          <td className="records-date">
                            {new Date(r.date).toLocaleDateString('ko-KR')}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="records-footer">
              <button className="btn" onClick={onClose}>닫기</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
