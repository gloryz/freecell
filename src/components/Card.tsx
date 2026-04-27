import './Card.css'
import { Card as CardType } from '../types/card'
import { getCardColor, getRankDisplay, getSuitSymbol } from '../utils/deck'

interface CardProps {
  card: CardType
  selected?: boolean
  dragging?: boolean
  onClick?: () => void
  onDoubleClick?: () => void
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  style?: React.CSSProperties
}

export default function Card({
  card,
  selected = false,
  dragging = false,
  onClick,
  onDoubleClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  style,
}: CardProps) {
  const color = getCardColor(card.suit)
  const rank = getRankDisplay(card.rank)
  const suit = getSuitSymbol(card.suit)

  return (
    <div
      className={`card ${color}${selected ? ' selected' : ''}${dragging ? ' dragging' : ''}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={style}
      title={`${rank} of ${card.suit}`}
    >
      <div className="card-top-left">
        <span className="card-rank">{rank}</span>
        <span className="card-suit">{suit}</span>
      </div>
      <span className="card-center-suit">{suit}</span>
      <div className="card-bottom-right">
        <span className="card-rank">{rank}</span>
        <span className="card-suit">{suit}</span>
      </div>
    </div>
  )
}
