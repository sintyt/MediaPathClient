import type { Route } from "./+types/photo";

import { useLoaderData, type LoaderFunctionArgs, Await, useNavigate } from "react-router";
import { Suspense, useEffect, useState } from "react";

import {
  Mode,
  type Config,
  type Photo,
} from "~/mediafile/v1/mediafile_pb";
import { MediafileGrpcClient } from "~/mediafileGrpcClient";

export function meta() {
  return [
    { title: "写真ファイル管理アプリ" },
    { name: "description", content: "写真ファイル情報から保存場所を取得し整理" },
  ];
}

// ローダー関数
export async function loader({ }: LoaderFunctionArgs) {

  // 設定データを取得 - これは即座に解決される
  const getConfigPromise = MediafileGrpcClient.getConfig({
    mode: Mode.CACHE,
  });

  // 写真データを取得
  const getPhotosPromise = MediafileGrpcClient.getPhotos({
    mode: Mode.CACHE,
  }).catch(error => {
    console.error("写真データの読み込みエラー:", error);
    return { photos: [] };
  });

  // 設定データをすぐに取得
  let config = null;
  let configError = "";
  try {
    const getConfigResponse = await getConfigPromise;
    config = getConfigResponse.config || null;
  } catch (error) {
    configError = error instanceof Error ? error.message : "MediafileServerが起動しているか確認してください。";
    console.error("設定データの読み込みエラー:", error);
  }

  return {
    config,
    configError,
    photosPromise: getPhotosPromise
  };
}

// photoのfullpathとrecommendedPathが同じか否かを返す
function IsMatchedPhoto(photo: Photo): boolean {
  return photo.fullpath === photo.recommendedPath;
}

// photosのfullpathとrecommendedPathが同じでないファイルの個数を返す
function CountUnmatchedPhotos(photos: Photo[]): number {
  return photos.filter((photo) => !IsMatchedPhoto(photo)).length;
}

// 読み込み中の表示
function LoadingIndicator({ message = "もう少しお待ちください．．．。" }: { message?: string }) {
  return (
    <main className="flex items-center justify-center py-8">
      <div className="text-center">
        <p className="text-lg font-semibold mb-2">{message}</p>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    </main>
  );
}

// エラーメッセージの表示
function ErrorDisplay({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <main className="flex items-center justify-center py-8">
      <div className="text-center">
        <p className="text-xl font-semibold mb-2 text-red-600">エラーが発生しました</p>
        <p className="text-gray-700">{message}</p>
        {onRetry ? (
          <button
            onClick={onRetry}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            再試行
          </button>
        ) : (
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            ページを再読み込み
          </button>
        )}
      </div>
    </main>
  );
}

// ソート方向の型定義
type SortDirection = 'asc' | 'desc' | null;
type SortColumn = 'fullpath' | 'recommendedPath' | 'id' | null;

// 写真データテーブル
function PhotoTable({ photos }: { photos: Photo[] }) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("recommendedPath");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  if (photos.length === 0) {
    return <p className="text-gray-500">写真データがありません</p>;
  }

  // ソート関数
  const sortPhotos = (photosToSort: Photo[], column: SortColumn, direction: SortDirection): Photo[] => {
    if (!column || !direction) return photosToSort;

    return [...photosToSort].sort((a, b) => {
      let valueA: string | number | undefined;
      let valueB: string | number | undefined;

      // ソートするカラムに応じて値を取得
      switch (column) {
        case 'fullpath':
          valueA = a.fullpath;
          valueB = b.fullpath;
          break;
        case 'recommendedPath':
          valueA = a.recommendedPath;
          valueB = b.recommendedPath;
          break;
        case 'id':
          valueA = a.id;
          valueB = b.id;
          break;
        default:
          valueA = a.recommendedPath;
          valueB = b.recommendedPath;
      }

      // null/undefined チェック
      if (valueA === undefined || valueA === null) return direction === 'asc' ? -1 : 1;
      if (valueB === undefined || valueB === null) return direction === 'asc' ? 1 : -1;

      // ソート方向に応じて比較
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return direction === 'asc'
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      } else {
        // 数値比較
        const numA = Number(valueA);
        const numB = Number(valueB);
        return direction === 'asc' ? numA - numB : numB - numA;
      }
    });
  };

  // ソートされた写真データ
  const sortedPhotos = sortPhotos(photos, sortColumn, sortDirection);

  // ソート方向を切り替える関数
  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // 同じカラムをクリックした場合は方向を切り替え
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 新しいカラムの場合は昇順でソート
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // ソートインジケーターを表示する関数
  const renderSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) return null;

    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto w-full max-w-5xl">
      <table className="table-auto border border-collapse border-gray-800 w-full">
        <thead>
          <tr className="bg-gray-200">
            <th
              className="p-2 cursor-pointer hover:bg-gray-300"
              onClick={() => toggleSort('fullpath')}
            >
              <div className="flex items-center justify-between">
                <span>元のパス</span>
                {renderSortIndicator('fullpath')}
              </div>
            </th>
            <th
              className="p-2 cursor-pointer hover:bg-gray-300"
              onClick={() => toggleSort('recommendedPath')}
            >
              <div className="flex items-center justify-between">
                <span>生成パス</span>
                {renderSortIndicator('recommendedPath')}
              </div>
            </th>
            <th
              className="p-2 cursor-pointer hover:bg-gray-300"
              onClick={() => toggleSort('id')}
            >
              <div className="flex items-center justify-between">
                <span>ID</span>
                {renderSortIndicator('id')}
              </div>
            </th>
            <th className="p-2">
              <div className="flex items-center justify-between">
              <span>アクション</span>
              <button
                onClick={async () => {
                if (confirm('すべてのファイルを移動しますか？')) {
                  try {
                  const allPhotos = sortedPhotos.filter(photo => !IsMatchedPhoto(photo));
                  if (allPhotos.length === 0) {
                    alert('移動が必要なファイルはありません');
                    return;
                  }
                  
                  await MediafileGrpcClient.movePhotos({
                    ids: allPhotos.map(photo => photo.id),
                    mode: Mode.FILE
                  });
                  alert(`${allPhotos.length}ファイルを移動しました`);
                  // 移動後にデータを更新
                  window.location.reload();
                  } catch (error) {
                  console.error("一括ファイル移動エラー:", error);
                  alert(`ファイルの移動に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`);
                  }
                }
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
              >
                全て移動
              </button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedPhotos.map((photo) => (
            <tr key={photo.id} className="border border-collapse border-gray-800">
              <td className="p-2">{photo.fullpath}</td>
              <td className="p-2">{photo.recommendedPath}</td>
              <td className="p-2">{photo.id}</td>
              <td className="p-2">
                {IsMatchedPhoto(photo) ? (
                  <span className="text-green-500">Ok</span>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        await MediafileGrpcClient.movePhotos({
                          ids: [photo.id],
                          mode: Mode.FILE
                        });
                        alert(`ファイルを移動しました: ${photo.recommendedPath}`);
                        // 移動後にデータを更新
                        window.location.reload();
                      } catch (error) {
                        console.error("ファイル移動エラー:", error);
                        alert(`ファイルの移動に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`);
                      }
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                  >
                    MISS - 移動する
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Photo() {
  const { config, configError, photosPromise } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [showTable, setShowTable] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 設定データのエラー処理
  if (configError) {
    return <ErrorDisplay message={configError} />;
  }

  // データの再取得
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1); // キーを変更して再レンダリングを強制
    navigate(".", { replace: true }); // 現在のルートを再読み込み
  };

  return (
    <main className="flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        {/* 写真データと設定の表示 */}
        <div className="text-center">
          <p className="mb-4">
            {config?.photoSources || "設定がありません"}
            <span className="text-gray-500">/</span>

            <Suspense fallback={<span>...</span>}>
              <Await
                resolve={photosPromise}
                errorElement={<span className="text-red-500">データエラー</span>}
              >
                {(photosResponse) => {
                  const photos = photosResponse.photos as Photo[] || [];
                  const unmatchedPhotosCount = CountUnmatchedPhotos(photos);

                  return (
                    <>
                      <button
                        onClick={() => setShowTable(!showTable)}
                        className="text-blue-600 hover:text-blue-800 underline focus:outline-none"
                      >
                        {unmatchedPhotosCount}
                      </button>
                    </>
                  );
                }}
              </Await>
            </Suspense>
          </p>

          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-md text-sm"
          >
            データ更新
          </button>
        </div>

        {/* 写真テーブル */}
        {showTable && (
          <Suspense fallback={<LoadingIndicator message="写真データ読み込み中．．．" />}>
            <Await
              resolve={photosPromise}
              errorElement={<ErrorDisplay message="写真データの読み込みに失敗しました" onRetry={refreshData} />}
            >
              {(photosResponse) => {
                const photos = photosResponse.photos as Photo[] || [];
                return <PhotoTable photos={photos} />;
              }}
            </Await>
          </Suspense>
        )}
      </div>
    </main >
  )
}
