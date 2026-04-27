import { Card, Suit, Rank } from '../types/card';

// Microsoft FreeCell 공식 딜 알고리즘 (딜 번호 1~32000)
// clubs=0~12, diamonds=13~25, hearts=26~38, spades=39~51
const MS_SUIT_ORDER: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']

export function msDeal(dealNumber: number): Card[][] {
  let seed = dealNumber

  const nextRand = () => {
    seed = (seed * 214013 + 2531011) & 0x7fffffff
    return seed >> 16
  }

  const deck = Array.from({ length: 52 }, (_, i) => i)
  for (let i = 51; i >= 1; i--) {
    const j = nextRand() % (i + 1)
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }

  const tableau: Card[][] = Array.from({ length: 8 }, () => [])
  deck.forEach((cardNum, i) => {
    const suit = MS_SUIT_ORDER[Math.floor(cardNum / 13)]
    const rank = (cardNum % 13 + 1) as Rank
    tableau[i % 8].push({ suit, rank, id: `${suit}-${rank}` })
  })

  return tableau
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ suit, rank: rank as Rank, id: `${suit}-${rank}` });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function dealCards(deck: Card[]): Card[][] {
  // 8 columns: first 4 get 7 cards, last 4 get 6 cards
  const tableau: Card[][] = Array.from({ length: 8 }, () => []);
  deck.forEach((card, i) => {
    tableau[i % 8].push(card);
  });
  return tableau;
}

export function getCardColor(suit: Suit): 'red' | 'black' {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

export function getRankDisplay(rank: Rank): string {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
  }
}
