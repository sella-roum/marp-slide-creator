import { useState, useEffect } from 'react';

/**
 * 指定された値のデバウンスされたバージョンを提供するカスタムフック。
 * 値が指定された遅延時間内に変更されなかった場合にのみ更新されます。
 * @template T デバウンスする値の型。
 * @param value デバウンスする値。
 * @param delay デバウンスの遅延時間 (ミリ秒)。
 * @returns デバウンスされた値。
 */
export function useDebounce<T>(value: T, delay: number): T {
  // デバウンスされた値を保持するためのステート
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(
    () => {
      // `value` が変更された後、`delay` ミリ秒経過してから `debouncedValue` を更新するタイマーを設定
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      // 次の `useEffect` が実行される前、またはコンポーネントがアンマウントされる時にタイマーをクリアする
      // これにより、`delay` 時間内に `value` が再度変更された場合、古いタイマーはキャンセルされる
      return () => {
        clearTimeout(handler);
      };
    },
    [value, delay] // `value` または `delay` が変更された場合にのみ `useEffect` を再実行
  );

  return debouncedValue;
}
