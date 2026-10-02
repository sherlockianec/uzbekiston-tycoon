const PIP_LAYOUTS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({ value, rolling }: { value: number; rolling: boolean }) {
  const active = new Set(PIP_LAYOUTS[value] ?? []);
  return (
    <div className={`die${rolling ? ' die--rolling' : ''}`}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className="die__pip" style={{ visibility: active.has(i) ? 'visible' : 'hidden' }} />
      ))}
    </div>
  );
}

export default function Dice({ dice, rolling }: { dice: [number, number] | null; rolling?: boolean }) {
  const [d1, d2] = dice ?? [0, 0];
  return (
    <div className="dice-row">
      <Die value={d1} rolling={!!rolling} />
      <Die value={d2} rolling={!!rolling} />
    </div>
  );
}
