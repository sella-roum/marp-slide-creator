import { getImage } from "./db";
import type { ImageType } from "./types";

const IMAGE_REFERENCE_REGEX = /!\[(.*?)\]\(image:\/\/([a-fA-F0-9-]+)\)/g;

const imageCache = new Map<string, string | null>();
const MAX_CACHE_SIZE = 100;

/**
 * キャッシュから画像データを取得、なければDBから取得してキャッシュするヘルパー関数
 * @param imageId 取得する画像のID
 * @returns Base64データURLまたはnull (Promise)
 */
async function getCachedImageData(imageId: string): Promise<string | null> {
  if (imageCache.has(imageId)) {
    return imageCache.get(imageId)!;
  }

  try {
    const imageData: ImageType | null = await getImage(imageId);
    const dataUrl = imageData?.dataUrl || null;

    if (imageCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = imageCache.keys().next().value;
      if (oldestKey) {
        imageCache.delete(oldestKey);
      }
    }

    imageCache.set(imageId, dataUrl);
    return dataUrl;
  } catch (error) {
    console.error(`Error fetching image data for ID ${imageId}:`, error);
    imageCache.set(imageId, null);
    return null;
  }
}

/**
 * Markdown テキスト内のカスタム画像参照 (image://<id>) を
 * IndexedDB から取得した Base64 データURLに非同期で置換します。
 * 画像データはメモリキャッシュされます。
 * @param markdown 元の Markdown テキスト
 * @returns Base64 に置換された Markdown テキスト (Promise)
 */
export async function processMarkdownForRender(markdown: string): Promise<string> {
  let processedMarkdown = markdown;
  const matches = [...markdown.matchAll(IMAGE_REFERENCE_REGEX)];
  const imageFetchPromises: Promise<{ id: string; dataUrl: string | null }>[] = [];

  const uniqueImageIds = new Set<string>();
  for (const match of matches) {
    if (match[2]) {
      uniqueImageIds.add(match[2]);
    }
  }

  uniqueImageIds.forEach((imageId) => {
    imageFetchPromises.push(
      getCachedImageData(imageId).then((dataUrl) => ({ id: imageId, dataUrl }))
    );
  });

  const imageDataResults = await Promise.all(imageFetchPromises);
  const imageDataMap = new Map<string, string | null>();
  imageDataResults.forEach((result) => {
    imageDataMap.set(result.id, result.dataUrl);
  });

  processedMarkdown = processedMarkdown.replace(
    IMAGE_REFERENCE_REGEX,
    (match, altText, imageId) => {
      const dataUrl = imageDataMap.get(imageId);
      if (dataUrl) {
        return `![${altText || ""}](${dataUrl})`;
      } else {
        console.warn(`Image data not found for ID: ${imageId}. Keeping reference.`);
        return match;
      }
    }
  );

  return processedMarkdown;
}

/**
 * 画像キャッシュをクリアする関数 (デバッグや必要に応じて使用)
 */
export function clearImageCache(): void {
  imageCache.clear();
  console.log("Image cache cleared.");
}
