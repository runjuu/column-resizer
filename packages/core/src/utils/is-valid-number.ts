export function isValidNumber(num?: unknown): num is number {
  return Number.isFinite(num) && (num as number) > 0;
}
