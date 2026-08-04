export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isEmailField(fieldIdOrLabel: string): boolean {
  return /correo|email/i.test(fieldIdOrLabel);
}
