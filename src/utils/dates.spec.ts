import { getColombiaWeekRange } from './dates';

const asUtcNoon = (date: string) => new Date(`${date}T12:00:00Z`);

describe('getColombiaWeekRange', () => {
  it('devuelve lunes a domingo para la semana actual', () => {
    const { from, to } = getColombiaWeekRange(0);
    const fromDate = asUtcNoon(from);
    const toDate = asUtcNoon(to);

    expect(fromDate.getUTCDay()).toBe(1); // lunes
    expect(toDate.getUTCDay()).toBe(0); // domingo
    expect((toDate.getTime() - fromDate.getTime()) / 86_400_000).toBe(6);
  });

  it('avanza 7 días con weeksOffset=1', () => {
    const current = getColombiaWeekRange(0);
    const next = getColombiaWeekRange(1);

    const diff =
      (asUtcNoon(next.from).getTime() - asUtcNoon(current.from).getTime()) /
      86_400_000;

    expect(diff).toBe(7);
  });
});
