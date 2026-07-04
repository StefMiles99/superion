export function matchesEventPattern(eventType: string, pattern: string): boolean {
  if (pattern === '*') {
    return true;
  }

  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return eventType.startsWith(`${prefix}.`) || eventType === prefix;
  }

  return eventType === pattern;
}
