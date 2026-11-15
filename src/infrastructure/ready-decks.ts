/** Fetch a ready-made deck asset from the app origin (precached by the SW). */
export async function loadReadyDeck(file: string): Promise<string> {
  const url = new URL(`./${file}`, document.baseURI);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Ready deck: HTTP ${response.status}`);
  return response.text();
}
