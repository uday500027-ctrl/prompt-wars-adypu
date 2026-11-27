/**
 * Triggers a client-side file download by creating a temporary object URL.
 * Cleans up the DOM element and revokes the URL immediately after click.
 *
 * @param content - The string content to write into the downloaded file.
 * @param filename - The suggested download filename (e.g. `report.json`).
 * @param mimeType - MIME type for the Blob (defaults to `text/plain;charset=utf-8`).
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType = "text/plain;charset=utf-8"
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
