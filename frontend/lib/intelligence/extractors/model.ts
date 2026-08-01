const MODEL_PATTERNS = [
  /\bT7\.\d{3}\b/i,
  /\bT6\.\d{3}\b/i,
  /\bT5\.\d{3}\b/i,
  /\bT8\.\d{3}\b/i,

  /\b6R\s?\d{3}\b/i,
  /\b7R\s?\d{3}\b/i,
  /\b8R\s?\d{3}\b/i,
  /\b9R\s?\d{3}\b/i,

  /\b3CX\b/i,
  /\b4CX\b/i,
  /\b535-\d{2,3}\b/i,
  /\b540-\d{2,3}\b/i,
  /\b542-\d{2,3}\b/i,

  /\b7726S?\b/i,
  /\b7718S?\b/i,
  /\b6718S?\b/i,
  /\b8740S\b/i,

  /\b930\b/i,
  /\b936\b/i,
  /\b960\b/i,
];

export function detectModel(text: string): string | undefined {
  for (const pattern of MODEL_PATTERNS) {
    const match = text.match(pattern);

    if (match) {
      return match[0].toUpperCase();
    }
  }

  return undefined;
}