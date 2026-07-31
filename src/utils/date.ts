const pad2 = (n: number) => n.toString().padStart(2, "0");

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseISODate(iso?: string): Date | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

// Formato chileno: DD-MM-AAAA
export function formatCLDate(iso?: string): string {
  const date = parseISODate(iso);
  if (!date) return "";
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`;
}

export function todayISODate(): string {
  return toISODate(new Date());
}
