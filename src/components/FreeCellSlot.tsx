import { Card as CardType } from '../types/card'
import Card from './Card'
import './Card.css'

interface FreeCellSlotProps {
  card: CardType | null
  cellIndex: number
  selected: boolean
  dragging: boolean
  hasSelection: boolean
  onClick: () => void
  onDoubleClick: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
}

export default function FreeCellSlot({
  card,
  cellIndex: _cellIndex,
  selected,
  dragging,
  hasSelection,
  onClick,
  onDoubleClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: FreeCellSlotProps) {
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); onDragOver(e) }
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); onDrop() }

  if (card) {
    return (
      <Card
        card={card}
        selected={selected}
        dragging={dragging}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onDragStart={(e) => { e.stopPropagation(); onDragStart() }}
        onDragEnd={onDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
    )
  }

  return (
    <div
      className={`card-slot-empty${hasSelection ? ' highlight' : ''}`}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      title="Free Cell"
    >
      <span className="slot-label">FC</span>
    </div>
  )
}
