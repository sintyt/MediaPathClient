import { useState, useEffect } from 'react';
import { mediafileGrpcClient } from './mediafileGrpcClient';
import { RequestMode, type GetPhotosRequest, type Photo } from "~/grpc/mediafile/v1/mediafile_pb";

export function usePhotos(mode: RequestMode, folder: string) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const a: GetPhotosRequest = {
    mode: mode,
    sourcePath: folder
    };
    
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setIsLoading(true);
        const response = await mediafileGrpcClient.getPhotos({
          mode: mode,
          sourcePath: folder
        });
        setPhotos(response.photos || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("写真データの取得に失敗しました"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhotos();
  }, [mode, folder]);

  return { photos, isLoading, error };
}
