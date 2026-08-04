// Utilidades para RUT chileno: formateo con puntos/guion y validación de dígito verificador.

export function cleanRut(value: string): string {
  return value.replace(/[^0-9kK]/g, "").toUpperCase();
}

export function computeRutDv(body: string): string {
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "K";
  return String(remainder);
}

export function isValidRut(value: string): boolean {
  const clean = cleanRut(value);
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  return computeRutDv(body) === dv;
}

export function formatRut(value: string): string {
  const clean = cleanRut(value);
  if (!clean) return "";
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!body) return clean;
  const bodyWithDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${bodyWithDots}-${dv}`;
}

export function isRutField(fieldIdOrLabel: string): boolean {
  return /rut/i.test(fieldIdOrLabel);
}
