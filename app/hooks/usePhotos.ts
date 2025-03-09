import { useState, useEffect } from 'react';
import { mediapathGrpcClient } from './mediapathGrpcClient';
import { RequestMode } from "~/generated/grpc/v1/enum_pb";
import { type GetPhotosRequest, type Photo } from "~/generated/grpc/v1/photo_pb";

export function usePhotos(folder: string) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setIsLoading(true);
        const response = await mediapathGrpcClient.getPhotos({
          mode: RequestMode.FILE_MODE,
          folder: folder
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
  }, [folder]);

  return { photos, isLoading, error };
}
