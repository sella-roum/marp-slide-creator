import { getImage } from './db'; // getImage 関数をインポート

// カスタムスキーマ `image://<uuid>` にマッチする正規表現
const IMAGE_REFERENCE_REGEX = /!\[(.*?)\]\(image:\/\/([a-fA-F0-9-]+)\)/g;

/**
 * Markdown テキスト内のカスタム画像参照 (image://<id>) を
 * IndexedDB から取得した Base64 データURLに非同期で置換します。
 * @param markdown 元の Markdown テキスト
 * @returns Base64 に置換された Markdown テキスト (Promise)
 */
export async function processMarkdownForRender(markdown: string): Promise<string> {
  let processedMarkdown = markdown;
  const matches = [...markdown.matchAll(IMAGE_REFERENCE_REGEX)];
  const imageFetchPromises: Promise<{ id: string; dataUrl: string | null }>[] = [];

  // ユニークな画像IDを収集
  const uniqueImageIds = new Set<string>();
  for (const match of matches) {
    if (match[2]) {
      uniqueImageIds.add(match[2]);
    }
  }

  // ユニークなIDごとにDB取得のPromiseを作成
  uniqueImageIds.forEach(imageId => {
    imageFetchPromises.push(
      getImage(imageId).then(imageData => ({
        id: imageId,
        dataUrl: imageData?.dataUrl || null, // 見つからない場合は null
      })).catch(error => {
          console.error(`Error fetching image data for ID ${imageId}:`, error);
          return { id: imageId, dataUrl: null }; // エラー時も null を返す
      })
    );
  });

  // すべての画像データを並行して取得
  const imageDataResults = await Promise.all(imageFetchPromises);

  // 取得結果をマップに変換して高速アクセス
  const imageDataMap = new Map<string, string | null>();
  imageDataResults.forEach(result => {
    imageDataMap.set(result.id, result.dataUrl);
  });

  // マッチした箇所を置換
  processedMarkdown = processedMarkdown.replace(IMAGE_REFERENCE_REGEX, (match, altText, imageId) => {
    const dataUrl = imageDataMap.get(imageId);
    if (dataUrl) {
      console.log(`Replaced image reference for ID: ${imageId}`);
      // Altテキストを保持して置換
      return `![${altText || ''}](${dataUrl})`;
    } else {
      // 画像が見つからなかった場合の処理
      console.warn(`Image data not found for ID: ${imageId}. Keeping reference.`);
      // 参照を残すか、エラー表示にするか選択
      // return `![⚠️ ${altText || ''} (画像が見つかりません: ${imageId})](${imageId})`; // エラー表示
      return match; // 元の参照文字列を残す
    }
  });

  return processedMarkdown;
}
