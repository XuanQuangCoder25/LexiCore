export interface LoadedImages {
  desert: string;
  card: string;
}

export async function loadAssets(
  onProgress: (p: number) => void
): Promise<LoadedImages> {
  const urls = [
    { key: "desert" as const, url: "https://assets.uberdesigner.ai/portale/desert.webp", fallback: "/desert.webp" },
    { key: "card" as const, url: "/lexicore-card.svg", fallback: "/lexicore-card.svg" },
  ];



  const totalFiles = urls.length;
  const fileBytes: number[] = new Array(totalFiles).fill(0);
  const fileTotals: number[] = new Array(totalFiles).fill(0);
  const results: Partial<LoadedImages> = {};

  const updateProgress = () => {
    let sumLoaded = 0;
    let sumTotal = 0;
    for (let i = 0; i < totalFiles; i++) {
      sumLoaded += fileBytes[i];
      sumTotal += fileTotals[i] > 0 ? fileTotals[i] : 400000; // estimated fallback size
    }
    const ratio = Math.min(1, Math.max(0, sumTotal > 0 ? sumLoaded / sumTotal : 0));
    onProgress(ratio);
  };

  const loadSingle = async (item: typeof urls[0], index: number): Promise<string> => {
    try {
      let res = await fetch(item.url);
      if (!res.ok && item.fallback) {
        res = await fetch(item.fallback);
      }
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);

      const contentLength = res.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength, 10) : 400000;
      fileTotals[index] = total;

      const reader = res.body?.getReader();
      if (!reader) {
        const mime = item.url.endsWith(".svg") ? "image/svg+xml" : "image/webp";
        const rawBlob = await res.blob();
        const blob = new Blob([rawBlob], { type: mime });
        fileBytes[index] = blob.size;
        updateProgress();
        const objectUrl = URL.createObjectURL(blob);
        await decodeImg(objectUrl);
        return objectUrl;
      }


      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          fileBytes[index] = received;
          updateProgress();
        }
      }

      const mime = item.url.endsWith(".svg") ? "image/svg+xml" : "image/webp";
      const blob = new Blob(chunks as BlobPart[], { type: mime });
      const objectUrl = URL.createObjectURL(blob);
      await decodeImg(objectUrl);
      return objectUrl;

    } catch (err) {
      console.warn(`Failed loading image asset ${item.url}, using direct URL:`, err);
      fileBytes[index] = fileTotals[index] || 400000;
      updateProgress();
      return item.url;
    }
  };

  const decodeImg = (src: string): Promise<void> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.decode().then(resolve).catch(() => resolve());
    });
  };

  // Load fonts concurrently
  const fontLoads = [
    document.fonts?.load ? document.fonts.load('300 1em "Geist"') : Promise.resolve([]),
    document.fonts?.load ? document.fonts.load('400 1em "Geist"') : Promise.resolve([]),
    document.fonts?.load ? document.fonts.load('500 1em "Geist"') : Promise.resolve([]),
  ];

  const [desertUrl, cardUrl] = await Promise.all([
    loadSingle(urls[0], 0),
    loadSingle(urls[1], 1),
    Promise.allSettled(fontLoads),
  ]);

  results.desert = desertUrl;
  results.card = cardUrl;

  return results as LoadedImages;
}
