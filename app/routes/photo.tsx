import type { Route } from "./+types/photo";

import { useLoaderData, type LoaderFunctionArgs, Await, useNavigate, useAsyncError } from "react-router";
import { Suspense, useEffect, useState } from "react";

import { RequestMode, ResponseStatus } from "~/generated/grpc/v1/enum_pb";
import { type Config } from "~/generated/grpc/v1/config_pb";
import { type Photo } from "~/generated/grpc/v1/photo_pb";
import { mediapathGrpcClient } from "~/hooks/mediapathGrpcClient";

// フローチャート
// ローダー関数
// 1. コンフィグレーションデータを取得しGrpcサーバーが起動しているか確認する
// 2. フォルダーを読み込む
// 3. サブフォルダーのステータスを表示する関数
// 4. エラー表示
// 5. サブフォルダーのチェックボタンをクリックしたときのハンドラ
// 6. リネームが必要なファイルがあるかチェックする関数
// 7. データの再取得
// 8. フォルダー内の全ファイルの移動処理
// 9. フォルダー名を取得する
// 10. 写真データと設定の表示
// 11. 写真テーブル
// 12. photoのfullpathrecommendedPathが同じか否かを返す
// 13. IsMatchedPhoto
// 14. photosのfullpathrecommendedPathが同じでないファイルの個数を返す
// 15. CountUnmatchedPhotos
// 16. 読み込み中の表示
// 17. LoadingIndicator
// 18. エラーメッセージの表示
// 19. ErrorDisplay
// 20. ソート方向の型定義
// 21. SortDirection
// 22. SortColumn
// 23. 写真データテーブル
// 24. PhotoTable

// ルートメタデータ
export function meta({ }: Route.MetaArgs) {
  return [
    { title: "写真ファイル管理アプリ" },
    { name: "description", content: "写真ファイル情報を元に保存場所を決定し移動" },
  ];
}

// ローダー関数
// コンフィギュレーションデータを取得しGrpcサーバーが起動しているか確認する
export async function loader({ }: LoaderFunctionArgs) {

  // コンフィグレーションの取得 - これは即座に解決される
  const loaderConfig =
    await mediapathGrpcClient.readConfig({ mode: RequestMode.FILE_MODE })
      .then(response => {
        if (!response || !response.config) {
          throw new Error("コンフィギュレーションデータが取得できません、ファイルアクセスに問題があると思われます。");
        }
        if (response instanceof Error) {
          throw response;
        }
        return response.config;
      })
      .catch(error => error instanceof Error
        ? error
        : new Error("photo.tsxのloader関数内で原因不明のエラーが発生しました。"));

  return { loaderConfig };
}

// フォルダーを読み込む
async function ReadEntry(folder: string | undefined) {
  // デバッグ用：デバッグの時のみfolderがundefinedになります。
  if (!folder) return new Error("引数folderが未定義です。");

  return await mediapathGrpcClient.readEntry({ folder }).then(response => {
    if (!response || response instanceof Error) {
      throw (response instanceof Error ? response : undefined);
    };
    return { path: folder, folders: response.folders, files: response.files, busy: false } as FolderEntry;
  }).catch(error => error instanceof Error ? error : new Error("不明なエラー"));
}

type FolderEntryMap = Map<string, FolderEntry>;

type FolderEntry = {
  path: string,
  folders: string[],
  files: string[],
  photos: Photo[],
  busy: boolean,
};



// ファイルの移動処理
export default function Photo() {
  const navigate = useNavigate();
  const { loaderConfig } = useLoaderData<typeof loader>();
  const [config, setConfig] = useState<Config>({} as Config);
  const [photoFolderEntryMap, setPhotoFolderEntryMap] = useState<FolderEntryMap>(new Map());
  const [showTable, setShowTable] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 無視するフォルダー名
  const [ignoreFolders, setIgnoreFolders] = useState<string[]>([".cach3", ".config", "test"]);

  // 最初に一度だけ実行されます。
  useEffect(() => {
    if (loaderConfig instanceof Error) {
      // エラーが発生した場合はアラートを表示してページをリロード
      alert(`MediaPathServerが起動しているか確認してください...\nエラー内容: ${loaderConfig.stack}`);
      window.location.reload();
      return;
    }
    // if (!loaderConfig) {
    //   alert("error")
    //   return;
    // }
    setConfig(loaderConfig as Config);
  }, []);

  // 写真フォルダーを読み込み、無視リストにないフォルダーのみをフィルタリング
  async function readRootFolders() {
    // フォルダーのリストを取得
    const response = await ReadEntry(config.rootPhotoFolder);
    if (response instanceof Error) throw response;

    // 無視リストにないフォルダのみをフィルタリング
    const folders = response.folders.filter(folder => {
      const folderName = folder.split("/").pop()?.toLowerCase() || "";
      // 無視リストに含まれるフォルダーを除外
      return !ignoreFolders.includes(folderName);
    });

    for (const folder of folders) {
      const entry = await ReadEntry(folder);
      if (entry instanceof Error) throw entry;

      for (const folder of folders) {
        photoFolderEntryMap.set(folder, { path: folder, folders: [], files: [], photos: [], busy: false });
      }
      
      return { folders };
    }
  }


  // サブフォルダーのステータスを表示する関数
  function ReviewsSubFolderStatus(folder: string) {
    const entry = photoFolderEntryMap.get(folder);
    if (entry === undefined) {
      return (<>未登録フォルダーです</>);
    }

    if (entry.busy) return (<div>読み込み中...</div>);

    console.log("length: ", entry.photos?.length);
    return (<>ファイル{entry.photos ? entry.photos.length : "-"}枚:</>);
  }

  // エラー表示
  function ReviewsError() {
    const error = useAsyncError() as Error;
    return (<span className="text-red-500">{error.message}</span>);
  }

  // サブフォルダーのチェックボタンをクリックしたときのハンドラ
  // 指定されたフォルダ内の全写真ファイル情報を取得する
  const OnSubFolderCheckButtonClicked = async (folder: string) => {
    const entry = photoFolderEntryMap.get(folder);
    if (entry === undefined) return;

    console.log("Entry is busy: ", entry.busy);
    if (entry.busy) return;

    const response = await ReadPhotos(folder);
    if (response instanceof Error) {
      alert(`写真ファイルの取得に失敗しました: ${response.message}`);
    } else {

      entry.photos = response.photos;
      const newMap = new Map(photoFolderEntryMap)
      newMap.set(folder, entry);
      setPhotoFolderEntryMap(newMap);
      ReviewsSubFolderStatus(folder);

      return;
    }
  }

  // フォルダー内の全写真ファイルの情報を読み込む
  async function ReadPhotos(folder: string) {
    return await mediapathGrpcClient.readPhotos({ mode: RequestMode.FILE_MODE, folder })
      .then(response => {
        if (response) {
          return { photos: response.photos };
        }
        throw (undefined)
      })
      .catch(error => error instanceof Error ? error : new Error("ReadPhotoFolderPromise: 不明なエラー"));
  }


  // リネームが必要なファイルがあるかチェックする関数
  const hasUnmatchedPhotos = (folder: string): boolean => {
    const entry = photoFolderEntryMap.get(folder);
    if (!entry || !entry.photos) return false;
    return CountUnmatchedPhotos(entry.photos) > 0;
  };

  // データの再取得
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1); // キーを変更して再レンダリングを強制
    navigate(".", { replace: true }); // 現在のルートを再読み込み
  };


  function SetPhotoFolderEntryBusy(folder: string, busy: boolean) {
    const entry = photoFolderEntryMap.get(folder);
    if (!entry) return;

    entry.busy = busy;
    const newMap = new Map(photoFolderEntryMap).set(folder, entry);
    setPhotoFolderEntryMap(newMap);
  }

  // フォルダー内の全ファイルの移動処理
  const clickMovePhotos = async (folder: string) => {
    const entry = photoFolderEntryMap.get(folder);
    if (!entry) return;

    SetPhotoFolderEntryBusy(folder, true);
    try {
      if (confirm("リネーム処理を実行しますか？")) {
        // リネームが必要なファイルのIDだけを取得
        const unmatchedIds = (photoFolderEntryMap.get(entry.path)?.photos || [])
          .filter(photo => !IsMatchedPhoto(photo))
          .map(photo => photo.id);

        if (unmatchedIds.length === 0) {
          SetPhotoFolderEntryBusy(folder, false);
          return;
        }

        let response = await mediapathGrpcClient.movePhotos({
          mode: RequestMode.FILE_MODE,
          ids: unmatchedIds
        });

        if (response.status === ResponseStatus.STATUS_OK) {
          alert("リネーム処理が完了しました");
          // ページのリロード
          window.location.reload();
        }
      }
    } catch (error) {
      alert(`リネーム処理に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`);
    }
    SetPhotoFolderEntryBusy(folder, false);
  }

  // フォルダー名を取得する
  function getFolderName(path: string): string {
    return "/" + path.split("/").pop() || "";
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
          <span className="px-2">検索対象ディレクトリまたはファイル: {config?.rootPhotoFolder || "コンフィギュレーションファイルの取得ができていません"}</span>

          <Suspense fallback={<LoadingIndicator message="写真データ読み込み中．．．" />}>
            <Await
              resolve={readRootFolders()}
              errorElement={<ReviewsError />}
            >
              {(response) => {
                if (!response) return null;
                return (
                  <>
                    <table className="table">
                      <thead>
                        <tr>
                          <th className="px-3 py-1">No</th>
                          <th className="px-3 py-1">Root</th>
                          <th className="px-3 py-1">Sub Folder</th>
                          <th className="px-3 py-1">Check</th>
                          <th className="px-3 py-1">Status</th>
                          <th className="px-3 py-1">Move</th>
                        </tr>
                      </thead>
                      <tbody>
                        {response.folders.map((folder, index) => (
                          <tr key={index} className="border-b border-gray-200">
                            <td className="px-3 py-1">{index + 1}</td>
                            <td className="px-3 py-1">{config.rootPhotoFolder}</td>
                            <td className="px-3 py-1">{getFolderName(folder)}</td>
                            <td className="px-3 py-1">
                              <button className="btn btn-primary" onClick={async () => OnSubFolderCheckButtonClicked(folder)}>
                                チェック
                              </button>
                            </td>
                            <td className="px-3 py-1">{ReviewsSubFolderStatus(folder)}</td>
                            <td className="px-3 py-1">
                              <button
                                className="btn btn-primary"
                                disabled={!hasUnmatchedPhotos(folder)}
                                onClick={async () => clickMovePhotos(folder)}
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

// photoのfullpathrecommendedPathが同じか否かを返す
function IsMatchedPhoto(photo: Photo): boolean {
  return photo.filePath === photo.uniquePath;
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
          valueA = a.uniquePath;
          valueB = b.uniquePath;
          break;
        case 'id':
          valueA = a.id;
          valueB = b.id;
          break;
        default:
          valueA = a.uniquePath;
          valueB = b.uniquePath;
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

                        await mediapathGrpcClient.movePhotos({
                          ids: allPhotos.map(photo => photo.id),
                          mode: RequestMode.FILE_MODE
                        });
                        alert(`${allPhotos.length}ファイルを移動しました`);
                        // 移動後にデータを更新
                        window.location.reload();
                      } catch (error) {
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
              <td className="p-2">{photo.uniquePath}</td>
              <td className="p-2">{photo.id}</td>
              <td className="p-2">
                {IsMatchedPhoto(photo) ? (
                  <span className="text-green-500">Ok</span>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        await mediapathGrpcClient.movePhotos({
                          ids: [photo.id],
                          mode: RequestMode.FILE_MODE
                        });
                        alert(`ファイルを移動しました: ${photo.uniquePath}`);
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

