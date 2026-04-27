import { Card as CardType } from '../types/card'
import Card from './Card'
import './Card.css'
import './TableauColumn.css'

interface TableauColumnProps {
  cards: CardType[]
  columnIndex: number
  selectedCards: CardType[]
  draggedIds: Set<string>
  hasSelection: boolean
  onClick: (cardIndex: number) => void
  onDoubleClick: (cardIndex: number) => void
  onEmptyClick: () => void
  onDragStart: (cardIndex: number) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
}

export default function TableauColumn({
  cards,
  columnIndex: _columnIndex,
  selectedCards,
  draggedIds,
  hasSelection,
  onClick,
  onDoubleClick,
  onEmptyClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: TableauColumnProps) {
  const selectedIds = new Set(selectedCards.map(c => c.id))
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); onDragOver(e) }
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); onDrop() }

  if (cards.length === 0) {
    return (
      <div className="tableau-column tableau-column-empty">
        <div
          className={`card-slot-empty tableau-empty-slot${hasSelection ? ' highlight' : ''}`}
          onClick={onEmptyClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          title="Empty Column"
        >
          <span className="slot-label">—</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="tableau-column"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {cards.map((card, idx) => {
        const isSelected = selectedIds.has(card.id)
        const isDragging = draggedIds.has(card.id)
        const offset = idx * 52
        return (
          <div
            key={card.id}
            style={{
              position: 'absolute',
              top: offset,
              left: 0,
              zIndex: idx + 1,
            }}
          >
            <Card
              card={card}
              selected={isSelected}
              dragging={isDragging}
              onClick={() => onClick(idx)}
              onDoubleClick={() => onDoubleClick(idx)}
              onDragStart={() => onDragStart(idx)}
              onDragEnd={onDragEnd}
            />
          </div>
        )
      })}
    </div>
  )
}
