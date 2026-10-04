import { BOARD_SIZE } from '../game/data/board';

/** The board is a wide, flat rectangle (width : height). */
export const BOARD_RATIO = 1.4;
/** Corner / side-column width as a percentage of the board WIDTH. */
export const CORNER_W_PCT = 15;
/** Top / bottom row height as a percentage of the board HEIGHT. */
export const CORNER_H_PCT = 15.5;

const COL_MID_W = (100 - 2 * CORNER_W_PCT) / 9;
const ROW_MID_H = (100 - 2 * CORNER_H_PCT) / 9;

/** 1-based grid cell of a board index. Index 0 (START) is bottom-right; the track runs clockwise. */
export function gridPosition(index: number): { row: number; col: number } {
  if (index === 0) return { row: 11, col: 11 };
  if (index <= 9) return { row: 11, col: 11 - index };
  if (index === 10) return { row: 11, col: 1 };
  if (index <= 19) return { row: 11 - (index - 10), col: 1 };
  if (index === 20) return { row: 1, col: 1 };
  if (index <= 29) return { row: 1, col: 1 + (index - 20) };
  if (index === 30) return { row: 1, col: 11 };
  return { row: 1 + (index - 30), col: 11 };
}

function colCentre(col: number): number {
  if (col === 1) return CORNER_W_PCT / 2;
  if (col === 11) return 100 - CORNER_W_PCT / 2;
  return CORNER_W_PCT + (col - 2 + 0.5) * COL_MID_W;
}
function rowCentre(row: number): number {
  if (row === 1) return CORNER_H_PCT / 2;
  if (row === 11) return 100 - CORNER_H_PCT / 2;
  return CORNER_H_PCT + (row - 2 + 0.5) * ROW_MID_H;
}

/** Centre of a tile as percentages of the board box. */
export function coordsPercent(index: number): { left: number; top: number } {
  const { row, col } = gridPosition(index);
  // On the flat side bars the text sits to the left, so the pawn stands at the right end of the bar.
  const flatShift = tileShape(index) === 'flat' ? CORNER_W_PCT / 2 - 2.2 : 0;
  return { left: colCentre(col) + flatShift, top: rowCentre(row) };
}

export type TileShape = 'corner' | 'tall' | 'flat';

/** Corners; the top and bottom rows are tall tiles; the two side columns are flat wide bars. */
export function tileShape(index: number): TileShape {
  if (index % 10 === 0) return 'corner';
  const { row } = gridPosition(index);
  return row === 1 || row === 11 ? 'tall' : 'flat';
}

/** Steps from `from` forward until the token reaches START (index 0). */
export function stepsToStart(from: number): number {
  return from === 0 ? BOARD_SIZE : BOARD_SIZE - from;
}
