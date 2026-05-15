export type StatusCounts = {
  done: number;
  current: number;
  awaiting: number;
  blocked: number;
  locked: number;
};

export type Segment = { key: keyof StatusCounts; length: number; offset: number };

export function computeSegments(counts: StatusCounts, circumference: number): Segment[] {
  const total = counts.done + counts.current + counts.awaiting + counts.blocked + counts.locked;
  const order: (keyof StatusCounts)[] = ['done', 'current', 'awaiting', 'blocked', 'locked'];
  let offset = 0;
  return order.map((key) => {
    const length = total === 0 ? 0 : (counts[key] / total) * circumference;
    const seg: Segment = { key, length, offset };
    offset += length;
    return seg;
  });
}
