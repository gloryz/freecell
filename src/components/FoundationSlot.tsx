import { Card as CardType, Suit } from '../types/card'
import Card from './Card'
import { getSuitSymbol, getCardColor } from '../utils/deck'
import './Card.css'

interface FoundationSlotProps {
  foundation: CardType[]
  suit: Suit
  suitIndex: number
  hasSelection: boolean
  onClick: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
}

export default function FoundationSlot({
  foundation,
  suit,
  suitIndex: _suitIndex,
  hasSelection,
  onClick,
  onDragOver,
  onDrop,
}: FoundationSlotProps) {
  const topCard = foundation.length > 0 ? foundation[foundation.length - 1] : null
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); onDragOver(e) }
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); onDrop() }

  if (topCard) {
    return (
      <Card
        card={topCard}
        onClick={onClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
    )
  }

  const color = getCardColor(suit)
  return (
    <div
      className={`card-slot-empty${hasSelection ? ' highlight' : ''}`}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      title={`Foundation: ${suit}`}
    >
      <span className="slot-label" style={{ color: color === 'red' ? '#cc4444' : '#ccc' }}>
        {getSuitSymbol(suit)}
      </span>
    </div>
  )
}
