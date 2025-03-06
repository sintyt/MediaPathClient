import type { Route } from "./+types/photo";


import { useLoaderData, type LoaderFunctionArgs, Await, useNavigate, useAsyncError } from "react-router";
import { Suspense, useEffect, useState } from "react";

import {
  RequestMode,
  ResponseStatus,
  type Config,
  type Photo,
} from "~/grpc/mediafile/v1/mediafile_pb";
import { GrpcMediafileClient } from "~/hooks/grpcMediafileClient";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "写真ファイル管理アプリ" },
    { name: "description", content: "写真ファイル情報を元に保存場所を決定し移動" },
  ];
}

// ローダー関数
export async function loader({ }: LoaderFunctionArgs) {
  // 設定データをすぐに取得
  const readConfigResponse = await ReadConfigPromise(RequestMode.FILE_MODE);
  return { readConfigResponse };
}

// 設定データを取得 - これは即座に解決される
const ReadConfigPromise = async (mode: RequestMode) => {
  return GrpcMediafileClient.readConfig({
    mode: mode,
  }).catch(error => {
    return error instanceof Error ? error : new Error("コンフィギュレーションデータの取得ができませんでした、MediafileServerが起動しているか確認してください。");
  });
};

// フォルダー内のフォルダー一覧を取得 
const ReadFolderPromise = async (mode: RequestMode) => {
  // 
  const IgnoreFolders = [".cache", ".config"];

  return await GrpcMediafileClient.readFolder({
    mode: mode,
  }).then(response => {
    return response.folders?.filter(folder =>
      // Check if folder name is in the ignore list
      !IgnoreFolders.some(ignoreFolder =>
        folder.toLowerCase().includes(ignoreFolder.toLowerCase()
      )
    ) || []);
  }).catch(error => {
    return error instanceof Error ? error : new Error("写真の配布先内のディレクトリ一覧の取得ができませんでした、MediafileServerが起動しているか確認してください。");
  });
};

// photoのfullpathrecommendedPathが同じか否かを返す
function IsMatchedPhoto(photo: Photo): boolean {
  return photo.filePath === photo.uniqueFilePath;
}

// photosのfullpathrecommendedPathが同じでないファイルの個数を返す
function CountUnmatchedPhotos(photos: Photo[]): number {
  return photos?.filter((photo) => !IsMatchedPhoto(photo)).length || 0;
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

type FolderEntry = {
  folderName: string,
  folders: string[],
  files: string[],
  isBusy: boolean,
};

type FolderEntryMap = Map<string, FolderEntry>;

export default function Photo() {
  const navigate = useNavigate();
  const { readConfigResponse } = useLoaderData<typeof loader>();
  const [config, setConfig] = useState<Config | undefined>(undefined);
  const [photoFolderStatusMap, setPhotoFolderStatusMap] = useState<FolderEntryMap>(new Map());
  const [photoFolderBusy, setPhotoFolderBusy] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // データの初期化
  useEffect(() => {
    if (readConfigResponse instanceof Error) {
      setConfig(undefined);
    } else {
      setConfig(readConfigResponse?.config as Config || undefined);
    }
  }, []);

  // データの再取得
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1); // キーを変更して再レンダリングを強制
    navigate(".", { replace: true }); // 現在のルートを再読み込み
  };

  const PhotoFolderStatus = (folder: string) => {

    const photoFolderEntry = photoFolderStatusMap.get(folder);
    if (photoFolderEntry === undefined) {
      const photofileExtensions = config?.photofileExtensions || [];
      return (<>未エントリー</>);
    }
    
    if (photoFolderEntry.isBusy) {
      return (<div>読み込み中...</div>);
    }

    const files = photoFolderEntry.files;
    if (files === undefined) {
      return (<></>);
    }

    return (
      <div>
        ファイル{files.length}枚
      </div>
    )
  }

  const ReviewsError = () => {
    const error = useAsyncError() as Error;
    return (<span className="text-red-500">{error.message}</span>);
  };

  // サブフォルダーのチェックボタンをクリックしたときのハンドラ
  const handlePhotoFolderCheckClick = async (folder: string) => {
    try {
      const photoFolderEntry = photoFolderStatusMap.get(folder);

      if (photoFolderEntry !== undefined) {
        const newMap = new Map(photoFolderStatusMap);
        newMap.set(folder, { ...photoFolderEntry, isBusy: true });
        setPhotoFolderStatusMap(newMap);
      }

      let response = await GetPhotosPromise(RequestMode.FILE_MODE, folder);
      if (response instanceof Error) {
        throw response;
      }
      if (response.photos) {
        // 新しいMapを作成して状態を更新
        const newMap = new Map(photoFolderStatusMap);
        newMap.set(folder, { folderName: folder, files: response.photos, isBusy: false });
        setPhotoFolderStatusMap(newMap);
      }

      const newMap = new Map(photoFolderStatusMap);
      if (photoFolderEntry !== undefined) {
        newMap.set(folder, { ...photoFolderEntry, isBusy: false });
        setPhotoFolderStatusMap(newMap);
      }

    } catch (error) {
      alert(`写真データの取得に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`);
    }
  };

  // リネームが必要なファイルがあるかチェックする関数
  const hasUnmatchedPhotos = (folder: string): boolean => {
    const photoState = photoFolderStatusMap.get(folder);
    if (!photoState || !photoState.photos) return false;
    return CountUnmatchedPhotos(photoState.photos) > 0;
  };

  const handlerMovePhotosClick = async (folder: string) => {
    setPhotoFolderBusy(true);
    try {
      if (confirm("リネーム処理を実行しますか？")) {
        // リネームが必要なファイルのIDだけを取得
        const unmatchedIds = (photoFolderStatusMap.get(folder)?.photos || [])
          .filter(photo => !IsMatchedPhoto(photo))
          .map(photo => photo.id);

        if (unmatchedIds.length === 0) {
          setPhotoFolderBusy(false);
          return;
        }

        let response = await GrpcMediafileClient.movePhotos({
          mode: RequestMode.FILE_MODE,
          ids: unmatchedIds
        });

        if (response.status === ResponseStatus.STATUS_OK) {
          alert("リネーム処理が完了しました");
          // データを更新
        }
      }
    } catch (error) {
      alert(`リネーム処理に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`);
    }
    setPhotoFolderBusy(false);
    navigate(".", { replace: true }); // 現在のルートを再読み込み
  }

  return (
    <main className="flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">

        {/* 写真データと設定の表示 */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">写真ファイル管理アプリ</h1>
          <p className="text-gray-500">写真ファイル情報から保存場所を取得し整理</p>
          <br />
          <div className="status status-info animate-bounce"></div>
          <span className="px-2">検索対象ディレクトリまたはファイル: {config?.managedPhotoFolder || "コンフィギュレーションファイルの取得ができていません"}</span>

          <Suspense fallback={<LoadingIndicator message="写真データ読み込み中．．．" />}>
            <Await
              resolve={ReadFolderPromise(RequestMode.FILE_MODE)}
              errorElement={<ReviewsError />}
            >
              {(folders) => {
                if (folders instanceof Error) return null;
                return (
                  <>
                    <table className="table">
                      <thead>
                        <tr>
                          <th className="px-3 py-1">No</th>
                          <th className="px-3 py-1">Folder</th>
                          <th className="px-3 py-1">Check</th>
                          <th className="px-3 py-1">Status</th>
                          <th className="px-3 py-1">Move</th>
                        </tr>
                      </thead>
                      <tbody>
                        {folders.map((folder, index) => (
                          <tr key={index} className="border-b border-gray-200">
                            <td className="px-3 py-1">{index + 1}</td>
                            <td className="px-3 py-1">{folder}</td>
                            <td className="px-3 py-1">
                              <button className="btn btn-primary" onClick={async () => handlePhotoFolderCheckClick(folder)}>
                                チェック
                              </button>
                            </td>
                            <td className="px-3 py-1">{PhotoFolderStatus(folder)}</td>
                            <td className="px-3 py-1">
                              <button
                                className="btn btn-primary"
                                disabled={!hasUnmatchedPhotos(folder)}
                                onClick={async () => handlerMovePhotosClick(folder)}
                              >
                                移動
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                );
              }}
            </Await>
          </Suspense>

          {/* <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-md text-sm"
          >
            データ更新
          </button> */}
        </div>

        {/* 写真テーブル */}
        {/* {showTable && (
          <Suspense fallback={<LoadingIndicator message="写真データ読み込み中．．．" />}>
            <Await
              resolve={GetPhotosPromise(RequestMode.CACHE)}
              errorElement={<ReviewsError />}
            >
              {(photosResponse) => {
                if (photosResponse instanceof Error) {
                  return <ErrorDisplay message={photosResponse.message} onRetry={refreshData} />;
                }
                const photos = photosResponse.photos || [];
                return <PhotoTable photos={photos} />;
              }}
            </Await>
          </Suspense>
        )} */}
      </div>
    </main >
  )
}


// ソート方向の型定義
type SortDirection = 'asc' | 'desc' | null;
type SortColumn = 'fullpath' | 'uniqueFilePath' | 'id' | null;

// 写真データテーブル
function PhotoTable({ photos }: { photos: Photo[] }) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("uniqueFilePath");
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
          valueA = a.filePath;
          valueB = b.filePath;
          break;
        case 'uniqueFilePath':
          valueA = a.uniqueFilePath;
          valueB = b.uniqueFilePath;
          break;
        case 'id':
          valueA = a.id;
          valueB = b.id;
          break;
        default:
          valueA = a.uniqueFilePath;
          valueB = b.uniqueFilePath;
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
              onClick={() => toggleSort('uniqueFilePath')}
            >
              <div className="flex items-center justify-between">
                <span>生成パス</span>
                {renderSortIndicator('uniqueFilePath')}
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

                        await GrpcMediafileClient.movePhotos({
                          ids: allPhotos.map(photo => photo.id),
                          mode: RequestMode.FILE_MODE
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
              <td className="p-2">{photo.filePath}</td>
              <td className="p-2">{photo.uniqueFilePath}</td>
              <td className="p-2">{photo.id}</td>
              <td className="p-2">
                {IsMatchedPhoto(photo) ? (
                  <span className="text-green-500">Ok</span>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        await GrpcMediafileClient.movePhotos({
                          ids: [photo.id],
                          mode: RequestMode.FILE_MODE
                        });
                        alert(`ファイルを移動しました: ${photo.uniqueFilePath}`);
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

