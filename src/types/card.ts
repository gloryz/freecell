export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Color = 'red' | 'black';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // e.g. "hearts-1", "spades-13"
}

export interface GameState {
  tableau: Card[][];          // 8 columns
  freeCells: (Card | null)[]; // 4 free cells
  foundations: Card[][];      // 4 foundations, one per suit
  selectedCard: SelectedCard | null;
  moves: number;
  won: boolean;
}

export interface SelectedCard {
  card: Card;
  source: CardSource;
  cards: Card[]; // the card + any cards below it that move together
}

export type CardSource =
  | { type: 'tableau'; columnIndex: number; cardIndex: number }
  | { type: 'freecell'; cellIndex: number }
  | { type: 'foundation'; suitIndex: number };
