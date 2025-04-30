import { getImage } from "./db"; // getImage 関数をインポート

// カスタムスキーマ `image://<uuid>` にマッチする正規表現
const IMAGE_REFERENCE_REGEX = /!\[(.*?)\]\(image:\/\/([a-fA-F0-9-]+)\)/g;

/**
 * Markdown テキスト内のカスタム画像参照 (image://<id>) を
 * キャッシュまたは IndexedDB から取得した Base64 データURLに非同期で置換します。
 * @param markdown 元の Markdown テキスト
 * @param imageCache 画像IDとDataURLのキャッシュ (Map)
 * @param updateImageCache キャッシュを更新する関数 (id: string, dataUrl: string | null) => void
 * @returns Base64 に置換された Markdown テキスト (Promise)
 */
export async function processMarkdownForRender(
  markdown: string,
  imageCache: Map<string, string | null>,
  updateImageCache: (id: string, dataUrl: string | null) => void
): Promise<string> {
  let processedMarkdown = markdown;
  const matches = [...markdown.matchAll(IMAGE_REFERENCE_REGEX)];
  const imageFetchPromises: Promise<void>[] = []; // Promise<void> に変更

  // ユニークな画像IDを収集し、キャッシュにないものを特定
  const uniqueImageIds = new Set<string>();
  const idsToFetch = new Set<string>();
  for (const match of matches) {
    const imageId = match[2];
    if (imageId) {
      uniqueImageIds.add(imageId);
      // キャッシュに存在しない場合のみ取得対象とする
      if (!imageCache.has(imageId)) {
        idsToFetch.add(imageId);
      }
    }
  }

  // キャッシュにないIDのみDB取得のPromiseを作成
  idsToFetch.forEach((imageId) => {
    imageFetchPromises.push(
      getImage(imageId)
        .then((imageData) => {
          const dataUrl = imageData?.dataUrl || null;
          // 取得結果をキャッシュに反映
          updateImageCache(imageId, dataUrl);
        })
        .catch((error) => {
          console.error(`Error fetching image data for ID ${imageId}:`, error);
          // エラー時もキャッシュにnullを記録して再取得を防ぐ
          updateImageCache(imageId, null);
          // Promise.all が失敗しないように、ここではエラーを投げない
        })
    );
  });

  // 必要な画像データを並行して取得
  if (imageFetchPromises.length > 0) {
    // console.log(`Fetching ${imageFetchPromises.length} images from DB...`);
    await Promise.all(imageFetchPromises);
    // console.log("Image fetching complete.");
    // Promise.all が完了すると、updateImageCache によって imageCache が更新されているはず
  }

  // マッチした箇所をキャッシュの内容で置換
  // replace メソッドは非同期処理を待たないため、Promise.all の後で実行する
  processedMarkdown = processedMarkdown.replace(
    IMAGE_REFERENCE_REGEX,
    (match, altText, imageId) => {
      // 最新のキャッシュからデータを取得
      const dataUrl = imageCache.get(imageId);
      if (dataUrl) {
        // console.log(`Replaced image reference for ID: ${imageId} using cache.`);
        // Altテキストを保持して置換
        return `![${altText || ""}](${dataUrl})`;
      } else {
        // キャッシュにない、またはnullの場合（取得失敗含む）
        console.warn(`Image data not found or failed to fetch for ID: ${imageId}. Keeping reference.`);
        // 元の参照文字列を残すか、代替テキストを表示するか選択
        // return `![⚠️ ${altText || ''} (画像読込エラー)](${imageId})`; // 代替テキスト例
        return match; // 元の参照文字列を残す
      }
    }
  );

  return processedMarkdown;
}
