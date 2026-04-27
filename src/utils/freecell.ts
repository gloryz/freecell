import { Card, GameState, CardSource } from '../types/card';
import { getCardColor } from './deck';

// Can a card be placed on top of another in tableau?
export function canPlaceOnTableau(card: Card, target: Card | null): boolean {
  if (target === null) return true; // empty column accepts any card
  return getCardColor(card.suit) !== getCardColor(target.suit) && card.rank === target.rank - 1;
}

// Can a card be placed in a foundation slot?
export function canPlaceOnFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) return card.rank === 1; // Ace starts
  const top = foundation[foundation.length - 1];
  return card.suit === top.suit && card.rank === top.rank + 1;
}

// Count empty free cells
export function countEmptyFreeCells(freeCells: (Card | null)[]): number {
  return freeCells.filter(c => c === null).length;
}

// Count empty tableau columns
export function countEmptyColumns(tableau: Card[][]): number {
  return tableau.filter(col => col.length === 0).length;
}

// Max cards that can be moved as a stack (based on free cells and empty columns)
export function maxMovableCards(
  freeCells: (Card | null)[],
  tableau: Card[][],
  targetIsEmpty: boolean
): number {
  const emptyCells = countEmptyFreeCells(freeCells);
  const emptyColumns = countEmptyColumns(tableau) - (targetIsEmpty ? 1 : 0);
  return (emptyCells + 1) * Math.pow(2, emptyColumns);
}

// Check if a sequence of cards is a valid moveable stack (alternating colors, descending ranks)
export function isValidStack(cards: Card[]): boolean {
  for (let i = 1; i < cards.length; i++) {
    const prev = cards[i - 1];
    const curr = cards[i];
    if (getCardColor(prev.suit) === getCardColor(curr.suit)) return false;
    if (prev.rank !== curr.rank + 1) return false;
  }
  return true;
}

// Check win condition
export function checkWin(foundations: Card[][]): boolean {
  return foundations.every(f => f.length === 13);
}

// Apply a move: returns new game state
export function applyMove(
  state: GameState,
  cards: Card[],
  source: CardSource,
  destination:
    | { type: 'tableau'; columnIndex: number }
    | { type: 'freecell'; cellIndex: number }
    | { type: 'foundation'; suitIndex: number }
): GameState {
  // 카드 ID로 실제 이동할 카드가 아직 소스에 있는지 검증 (stale move 방지)
  if (source.type === 'tableau') {
    const actual = state.tableau[source.columnIndex]?.[source.cardIndex];
    if (!actual || actual.id !== cards[0].id) return state;
  } else if (source.type === 'freecell') {
    const actual = state.freeCells[source.cellIndex];
    if (!actual || actual.id !== cards[0].id) return state;
  }

  // Deep clone state
  const newState: GameState = {
    tableau: state.tableau.map(col => [...col]),
    freeCells: [...state.freeCells],
    foundations: state.foundations.map(f => [...f]),
    selectedCard: null,
    moves: state.moves + 1,
    won: false,
  };

  // Remove cards from source
  if (source.type === 'tableau') {
    newState.tableau[source.columnIndex] = newState.tableau[source.columnIndex].slice(
      0,
      source.cardIndex
    );
  } else if (source.type === 'freecell') {
    newState.freeCells[source.cellIndex] = null;
  } else if (source.type === 'foundation') {
    newState.foundations[source.suitIndex] = newState.foundations[source.suitIndex].slice(0, -1);
  }

  // Add cards to destination
  if (destination.type === 'tableau') {
    newState.tableau[destination.columnIndex] = [
      ...newState.tableau[destination.columnIndex],
      ...cards,
    ];
  } else if (destination.type === 'freecell') {
    newState.freeCells[destination.cellIndex] = cards[0];
  } else if (destination.type === 'foundation') {
    newState.foundations[destination.suitIndex] = [
      ...newState.foundations[destination.suitIndex],
      ...cards,
    ];
  }

  newState.won = checkWin(newState.foundations);
  return newState;
}
