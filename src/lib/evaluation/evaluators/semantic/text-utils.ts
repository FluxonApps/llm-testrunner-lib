// Splits the response into unique lowercase words.
export function splitIntoWords(text: string): string[] {
  return [...new Set(text.toLowerCase().split(/[^\w]+/))];
}
