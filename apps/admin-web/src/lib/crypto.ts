/**
 * Compute SHA-256 hash of a file
 */
export async function computeFileSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute SHA-256 hash of all files in a folder tree
 */
export async function computeFolderHash(files: File[]): Promise<Map<string, string>> {
  const hashes = new Map<string, string>();
  for (const file of files) {
    hashes.set(file.name, await computeFileSHA256(file));
  }
  return hashes;
}
