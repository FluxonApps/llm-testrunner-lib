/**
 * Reads a file asynchronously and returns its content as a string
 * @param file - The File object to read
 * @returns Promise that resolves with the file content as a string
 */
export function readFileAsync(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

