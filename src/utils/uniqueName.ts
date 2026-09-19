export function isNameTaken(name: string, existingNames: string[]): boolean {
  const normalized = name.trim().toLowerCase();
  return existingNames.some((existing) => existing.trim().toLowerCase() === normalized);
}

export function suggestUniqueName(name: string, existingNames: string[]): string {
  const trimmed = name.trim();
  let counter = 1;
  let candidate = `${trimmed} (${counter})`;
  while (isNameTaken(candidate, existingNames)) {
    counter += 1;
    candidate = `${trimmed} (${counter})`;
  }
  return candidate;
}
