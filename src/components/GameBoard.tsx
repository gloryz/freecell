import { useState, useCallback, useEffect } from 'react'
import './GameBoard.css'
import { GameState, Card, CardSource } from '../types/card'
import { msDeal } from '../utils/deck'
import { updateRecord } from '../utils/records'
import { submitGlobalRecord, getNickname, saveNickname } from '../utils/api'
import RecordsModal from './RecordsModal'
import {
  canPlaceOnTableau,
  canPlaceOnFoundation,
  maxMovableCards,
  isValidStack,
  applyMove,
} from '../utils/freecell'
import FreeCellSlot from './FreeCellSlot'
import FoundationSlot from './FoundationSlot'
import TableauColumn from './TableauColumn'

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const

type Destination =
  | { type: 'tableau'; columnIndex: number }
  | { type: 'freecell'; cellIndex: number }
  | { type: 'foundation'; suitIndex: number }

// 풀 수 없는 것으로 알려진 MS FreeCell 딜 번호
const UNSOLVABLE_DEALS = new Set([11982, 146692, 186216, 455889, 495505, 512118, 517776])

function pickDeal(): number {
  let n: number
  do { n = Math.floor(Math.random() * 32000) + 1 } while (UNSOLVABLE_DEALS.has(n))
  return n
}

function createGameState(dealNumber: number): GameState {
  return {
    tableau: msDeal(dealNumber),
    freeCells: [null, null, null, null],
    foundations: [[], [], [], []],
    selectedCard: null,
    moves: 0,
    won: false,
  }
}

function foundationIndexForSuit(suit: string): number {
  return SUITS.indexOf(suit as typeof SUITS[number])
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function buildStack(column: Card[], cardIndex: number): Card[] {
  const subStack = column.slice(cardIndex)
  let validLength = 1
  for (let i = 1; i < subStack.length; i++) {
    if (isValidStack(subStack.slice(0, i + 1))) validLength = i + 1
    else break
  }
  return subStack.slice(0, validLength)
}

// 안전하게 파운데이션으로 보낼 수 있는 카드를 찾는다.
// "안전" 조건: 반대 색상의 rank-1 카드가 모두 파운데이션에 있을 때
// (그래야 해당 카드가 나중에 다른 카드의 이동 경로로 필요하지 않음)
function findAutoMove(state: GameState): { card: Card; source: CardSource; suitIndex: number } | null {
  const { tableau, freeCells, foundations } = state
  const isRed = (suit: string) => suit === 'hearts' || suit === 'diamonds'

  const isSafeToAuto = (card: Card): boolean => {
    if (card.rank <= 2) return true
    const oppositeSuits = SUITS.filter(s => isRed(s) !== isRed(card.suit))
    return oppositeSuits.every(s => foundations[SUITS.indexOf(s)].length >= card.rank - 1)
  }

  // 프리셀 먼저 확인
  for (let i = 0; i < freeCells.length; i++) {
    const card = freeCells[i]
    if (!card) continue
    const suitIndex = SUITS.indexOf(card.suit)
    if (canPlaceOnFoundation(card, foundations[suitIndex]) && isSafeToAuto(card))
      return { card, source: { type: 'freecell', cellIndex: i }, suitIndex }
  }

  // 태블로 각 컬럼의 맨 아래 카드 확인
  for (let i = 0; i < tableau.length; i++) {
    const col = tableau[i]
    if (col.length === 0) continue
    const card = col[col.length - 1]
    const suitIndex = SUITS.indexOf(card.suit)
    if (canPlaceOnFoundation(card, foundations[suitIndex]) && isSafeToAuto(card))
      return { card, source: { type: 'tableau', columnIndex: i, cardIndex: col.length - 1 }, suitIndex }
  }

  return null
}

export default function GameBoard() {
  const [dealNumber, setDealNumber] = useState(pickDeal)
  const [gameState, setGameState] = useState(() => createGameState(dealNumber))
  const [invalidSource, setInvalidSource] = useState<string | null>(null)
  const [dragSource, setDragSource] = useState<{ cards: Card[]; source: CardSource } | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [history, setHistory] = useState<GameState[]>([])
  const [windowFocused, setWindowFocused] = useState(true)
  const [showRecords, setShowRecords] = useState(false)
  const [nickname, setNickname] = useState(getNickname)
  const [nicknameInput, setNicknameInput] = useState('')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'ok' | 'skipped' | 'fail'>('idle')

  // 포커스가 없을 때 타이머 및 자동 이동 정지
  useEffect(() => {
    const onBlur = () => setWindowFocused(false)
    const onFocus = () => setWindowFocused(true)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  // Timer: 첫 조작 전 / won / paused / 포커스 없을 때 정지
  useEffect(() => {
    if (!started || gameState.won || paused || !windowFocused) return
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [started, gameState.won, paused, windowFocused])

  // 게임 클리어 시 로컬 기록 저장 + 글로벌 자동 제출 (닉네임이 있는 경우)
  useEffect(() => {
    if (!gameState.won) return
    updateRecord(dealNumber, elapsed, gameState.moves)
    setSubmitStatus('idle')
    if (nickname) {
      setSubmitStatus('submitting')
      submitGlobalRecord(nickname, dealNumber, elapsed, gameState.moves).then(result => {
        setSubmitStatus(result === 'saved' ? 'ok' : result === 'skipped' ? 'skipped' : 'fail')
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.won])

  // 조건이 될 때마다 카드를 파운데이션으로 자동 이동
  // setGameState 안에서 최신 상태로 재계산 → stale closure 버그 방지
  useEffect(() => {
    if (gameState.won || paused || !windowFocused) return
    if (!findAutoMove(gameState)) return
    const timer = setTimeout(() => {
      setGameState(s => {
        const m = findAutoMove(s)
        if (!m) return s
        return applyMove(s, [m.card], m.source, { type: 'foundation', suitIndex: m.suitIndex })
      })
    }, 200)
    return () => clearTimeout(timer)
  }, [gameState, paused, windowFocused])

  const flashInvalid = useCallback((key: string) => {
    setInvalidSource(key)
    setTimeout(() => setInvalidSource(null), 400)
  }, [])

  const handleUndo = useCallback(() => {
    if (history.length === 0) return
    const last = history[history.length - 1]
    setGameState(last)
    setDragSource(null)
    setHistory(history.slice(0, -1))
  }, [history])

  const handleNewGame = useCallback(() => {
    const newDeal = pickDeal()
    setDealNumber(newDeal)
    setGameState(createGameState(newDeal))
    setElapsed(0)
    setStarted(false)
    setDragSource(null)
    setPaused(false)
    setHistory([])
    setSubmitStatus('idle')
  }, [])


  const handleTogglePause = useCallback(() => {
    setPaused(prev => !prev)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGameState(prev => ({ ...prev, selectedCard: null }))
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleUndo])

  // ---- Selection helpers ----
  function selectCard(card: Card, source: CardSource, cards: Card[]) {
    setGameState(prev => ({ ...prev, selectedCard: { card, source, cards } }))
  }

  function clearSelection() {
    setGameState(prev => ({ ...prev, selectedCard: null }))
  }

  // ---- Start timer on first interaction ----
  function startIfNeeded() {
    if (!started) setStarted(true)
  }

  // ---- History ----
  function pushHistory() {
    setHistory(prev => [...prev, gameState])
  }

  // ---- Common move executor (shared by click and drag) ----
  function executeMove(cards: Card[], source: CardSource, dest: Destination): boolean {
    const { tableau, freeCells, foundations } = gameState

    if (dest.type === 'freecell') {
      if (freeCells[dest.cellIndex] !== null) {
        flashInvalid(`freecell-${dest.cellIndex}`); return false
      }
      if (cards.length !== 1) {
        flashInvalid(`freecell-${dest.cellIndex}`); return false
      }
    } else if (dest.type === 'foundation') {
      if (cards.length !== 1) {
        flashInvalid(`foundation-${dest.suitIndex}`); return false
      }
      if (!canPlaceOnFoundation(cards[0], foundations[dest.suitIndex])) {
        flashInvalid(`foundation-${dest.suitIndex}`); return false
      }
    } else {
      const column = tableau[dest.columnIndex]
      const targetCard = column.length > 0 ? column[column.length - 1] : null
      const targetIsEmpty = column.length === 0
      if (!canPlaceOnTableau(cards[0], targetCard)) {
        flashInvalid(`tableau-${dest.columnIndex}`); return false
      }
      const maxMovable = maxMovableCards(freeCells, tableau, targetIsEmpty)
      if (cards.length > maxMovable) {
        flashInvalid(`tableau-${dest.columnIndex}`); return false
      }
    }

    startIfNeeded()
    pushHistory()
    setGameState(s => applyMove(s, cards, source, dest))
    return true
  }

  // ---- Click handlers ----
  function handleFreeCellClick(cellIndex: number) {
    const { freeCells, selectedCard } = gameState
    if (selectedCard) {
      if (selectedCard.source.type === 'freecell' && selectedCard.source.cellIndex === cellIndex) {
        const card = freeCells[cellIndex]
        if (card) tryAutoMove(card, { type: 'freecell', cellIndex })
        clearSelection(); return
      }
      executeMove(selectedCard.cards, selectedCard.source, { type: 'freecell', cellIndex })
      clearSelection(); return
    }
    const card = freeCells[cellIndex]
    if (!card) return
    if (!tryAutoMove(card, { type: 'freecell', cellIndex })) {
      selectCard(card, { type: 'freecell', cellIndex }, [card])
    }
  }

  function handleFoundationClick(suitIndex: number) {
    const { foundations, selectedCard } = gameState
    if (selectedCard) {
      executeMove(selectedCard.cards, selectedCard.source, { type: 'foundation', suitIndex })
      clearSelection(); return
    }
    const foundation = foundations[suitIndex]
    if (foundation.length === 0) return
    const card = foundation[foundation.length - 1]
    selectCard(card, { type: 'foundation', suitIndex }, [card])
  }

  function handleTableauClick(columnIndex: number, cardIndex: number) {
    const { tableau, selectedCard } = gameState
    const column = tableau[columnIndex]
    if (selectedCard) {
      const src = selectedCard.source
      if (src.type === 'tableau' && src.columnIndex === columnIndex && src.cardIndex === cardIndex) {
        tryAutoMove(column[cardIndex], { type: 'tableau', columnIndex, cardIndex })
        clearSelection(); return
      }
      executeMove(selectedCard.cards, src, { type: 'tableau', columnIndex })
      clearSelection(); return
    }
    if (column.length === 0 || cardIndex >= column.length) return
    const cards = buildStack(column, cardIndex)
    if (cardIndex + cards.length !== column.length) {
      flashInvalid(`tableau-${columnIndex}`); return
    }
    if (cards.length === 1) {
      if (tryAutoMove(cards[0], { type: 'tableau', columnIndex, cardIndex })) return
    }
    selectCard(cards[0], { type: 'tableau', columnIndex, cardIndex }, cards)
  }

  function handleTableauEmptyClick(columnIndex: number) {
    const { selectedCard } = gameState
    if (!selectedCard) return
    executeMove(selectedCard.cards, selectedCard.source, { type: 'tableau', columnIndex })
    clearSelection()
  }

  // ---- Auto-move to foundation or freecell ----
  function tryAutoMove(card: Card, source: CardSource): boolean {
    const { foundations, freeCells } = gameState
    const suitIndex = foundationIndexForSuit(card.suit)
    if (canPlaceOnFoundation(card, foundations[suitIndex])) {
      startIfNeeded()
      pushHistory()
      setGameState(s => applyMove(s, [card], source, { type: 'foundation', suitIndex }))
      return true
    }
    const emptyCellIndex = freeCells.findIndex(c => c === null)
    if (emptyCellIndex !== -1) {
      startIfNeeded()
      pushHistory()
      setGameState(s => applyMove(s, [card], source, { type: 'freecell', cellIndex: emptyCellIndex }))
      return true
    }
    return false
  }

  function handleTableauDoubleClick(columnIndex: number, cardIndex: number) {
    const column = gameState.tableau[columnIndex]
    if (cardIndex !== column.length - 1) return
    tryAutoMove(column[cardIndex], { type: 'tableau', columnIndex, cardIndex })
  }

  function handleFreeCellDoubleClick(cellIndex: number) {
    const card = gameState.freeCells[cellIndex]
    if (!card) return
    tryAutoMove(card, { type: 'freecell', cellIndex })
  }

  // ---- Drag handlers ----
  function handleTableauDragStart(columnIndex: number, cardIndex: number) {
    const column = gameState.tableau[columnIndex]
    if (cardIndex >= column.length) return
    const cards = buildStack(column, cardIndex)
    if (cardIndex + cards.length !== column.length) return
    setDragSource({ cards, source: { type: 'tableau', columnIndex, cardIndex } })
  }

  function handleFreeCellDragStart(cellIndex: number) {
    const card = gameState.freeCells[cellIndex]
    if (!card) return
    setDragSource({ cards: [card], source: { type: 'freecell', cellIndex } })
  }

  function handleDragEnd() {
    setDragSource(null)
  }

  function handleDropOnFreeCell(cellIndex: number) {
    if (!dragSource) return
    executeMove(dragSource.cards, dragSource.source, { type: 'freecell', cellIndex })
    setDragSource(null)
  }

  function handleDropOnFoundation(suitIndex: number) {
    if (!dragSource) return
    executeMove(dragSource.cards, dragSource.source, { type: 'foundation', suitIndex })
    setDragSource(null)
  }

  function handleDropOnTableau(columnIndex: number) {
    if (!dragSource) return
    executeMove(dragSource.cards, dragSource.source, { type: 'tableau', columnIndex })
    setDragSource(null)
  }

  // Compute wrapper height so stacked cards don't overflow
  function columnHeight(cards: Card[]): number {
    if (cards.length === 0) return 220
    return (cards.length - 1) * 52 + 200 + 16
  }

  const { tableau, freeCells, foundations, selectedCard, moves, won } = gameState
  const hasSelection = selectedCard !== null
  const selectedCards = selectedCard ? selectedCard.cards : []
  const draggedIds = new Set(dragSource?.cards.map(c => c.id) ?? [])

  return (
    <div className="game-board">
      {/* TOP AREA */}
      <div className="top-area">
        {/* Free Cells */}
        <div className="free-cells">
          {freeCells.map((card, idx) => {
            const isSelected =
              selectedCard?.source.type === 'freecell' &&
              selectedCard.source.cellIndex === idx
            const isDragging =
              dragSource?.source.type === 'freecell' &&
              dragSource.source.cellIndex === idx
            return (
              <div
                key={idx}
                className={invalidSource === `freecell-${idx}` ? 'invalid-flash' : ''}
              >
                <FreeCellSlot
                  card={card}
                  cellIndex={idx}
                  selected={isSelected}
                  dragging={isDragging}
                  hasSelection={hasSelection && !isSelected}
                  onClick={() => handleFreeCellClick(idx)}
                  onDoubleClick={() => handleFreeCellDoubleClick(idx)}
                  onDragStart={() => handleFreeCellDragStart(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropOnFreeCell(idx)}
                />
              </div>
            )
          })}
        </div>

        {/* Center info + buttons */}
        <div className="game-info">
          <span className="deal-number">Deal #{dealNumber}</span>
          <span className="moves-counter">Moves: {moves}</span>
          <span className="timer">{formatTime(elapsed)}{!started ? '' : !windowFocused && !paused ? ' ⏸' : ''}</span>
          <div className="btn-col">
            {!won && started && (
              <button className="btn btn-pause" onClick={handleTogglePause}>
                {paused ? '▶ Resume' : '⏸ Pause'}
              </button>
            )}
            {!won && (
              <button className="btn btn-undo" onClick={handleUndo} disabled={history.length === 0}>
                ↩ Undo
              </button>
            )}
            <button className="btn btn-records" onClick={() => setShowRecords(true)}>🏆 Records</button>
            <button className="btn" onClick={handleNewGame}>New Game</button>
          </div>
        </div>

        {/* Foundations */}
        <div className="foundations">
          {SUITS.map((suit, idx) => (
            <div
              key={suit}
              className={invalidSource === `foundation-${idx}` ? 'invalid-flash' : ''}
            >
              <FoundationSlot
                foundation={foundations[idx]}
                suit={suit}
                suitIndex={idx}
                hasSelection={hasSelection}
                onClick={() => handleFoundationClick(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOnFoundation(idx)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* TABLEAU AREA */}
      <div className="tableau-area">
        {tableau.map((column, colIdx) => (
          <div
            key={colIdx}
            className={`tableau-wrapper${invalidSource === `tableau-${colIdx}` ? ' invalid-flash' : ''}`}
            style={{ height: columnHeight(column) }}
          >
            <TableauColumn
              cards={column}
              columnIndex={colIdx}
              selectedCards={selectedCards}
              draggedIds={draggedIds}
              hasSelection={hasSelection}
              onClick={(cardIdx) => handleTableauClick(colIdx, cardIdx)}
              onDoubleClick={(cardIdx) => handleTableauDoubleClick(colIdx, cardIdx)}
              onEmptyClick={() => handleTableauEmptyClick(colIdx)}
              onDragStart={(cardIdx) => handleTableauDragStart(colIdx, cardIdx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDropOnTableau(colIdx)}
            />
          </div>
        ))}
      </div>

      {/* RECORDS MODAL */}
      {showRecords && (
        <RecordsModal
          onClose={() => setShowRecords(false)}
        />
      )}

      {/* PAUSE OVERLAY */}
      {paused && !won && (
        <div className="pause-overlay" onClick={handleTogglePause}>
          <div className="win-modal pause-modal" onClick={e => e.stopPropagation()}>
            <h2>⏸ Paused</h2>
            <p>{formatTime(elapsed)} · {moves} moves</p>
            <button className="btn" onClick={handleTogglePause}>▶ Resume</button>
          </div>
        </div>
      )}

      {/* WIN OVERLAY */}
      {won && (
        <div className="win-overlay">
          <div className="win-modal">
            <h2>You Win!</h2>
            <p>Completed in {moves} moves · {formatTime(elapsed)}</p>

            {/* Global leaderboard submission */}
            <div className="win-global">
              {nickname ? (
                <div className="win-submit-status">
                  {submitStatus === 'submitting' && <span className="submit-pending">🌐 글로벌 등록 중…</span>}
                  {submitStatus === 'ok' && <span className="submit-ok">✓ 글로벌 등록 완료 ({nickname})</span>}
                  {submitStatus === 'skipped' && <span className="submit-ok">✓ 오늘 더 좋은 기록이 있어요 ({nickname})</span>}
                  {submitStatus === 'fail' && <span className="submit-fail">✗ 서버 연결 실패</span>}
                  {submitStatus === 'idle' && null}
                </div>
              ) : (
                <div className="win-nickname-row">
                  <span className="win-nickname-label">닉네임 설정 후 글로벌 등록:</span>
                  <input
                    className="win-nickname-input"
                    type="text"
                    maxLength={20}
                    placeholder="닉네임 (최대 20자)"
                    value={nicknameInput}
                    onChange={e => setNicknameInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const name = nicknameInput.trim()
                        if (!name) return
                        saveNickname(name)
                        setNickname(name)
                        setSubmitStatus('submitting')
                        submitGlobalRecord(name, dealNumber, elapsed, moves).then(result => {
                          setSubmitStatus(result === 'saved' ? 'ok' : result === 'skipped' ? 'skipped' : 'fail')
                        })
                      }
                    }}
                  />
                  <button
                    className="btn btn-small btn-submit-global"
                    disabled={!nicknameInput.trim()}
                    onClick={() => {
                      const name = nicknameInput.trim()
                      if (!name) return
                      saveNickname(name)
                      setNickname(name)
                      setSubmitStatus('submitting')
                      submitGlobalRecord(name, dealNumber, elapsed, moves).then(result => {
                        setSubmitStatus(result === 'saved' ? 'ok' : result === 'skipped' ? 'skipped' : 'fail')
                      })
                    }}
                  >등록</button>
                </div>
              )}
            </div>

            <div className="btn-row">
              <button className="btn" onClick={handleNewGame}>Play Again</button>
              <button className="btn btn-quit" onClick={() => window.electronAPI?.quit()}>Quit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
