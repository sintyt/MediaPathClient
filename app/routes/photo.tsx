import type { Route } from "./+types/photo";

import { useLoaderData, type LoaderFunctionArgs, useNavigation } from "react-router";

import {
  Mode,
  type Photo,
} from "~/mediafile/v1/mediafile_pb";
import { MediafileGrpcClient } from "~/mediafileGrpcClient";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Photo file manager" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function loader({ }: LoaderFunctionArgs) {
  const getConfigRequest = {
    mode: Mode.CACHE,
  };
  const getPhotosRequest = {
    mode: Mode.FILE,
  };

  try {
    const [getConfigResponse, getPhotosResponse] = await Promise.all([
      MediafileGrpcClient.getConfig(getConfigRequest),
      MediafileGrpcClient.getPhotos(getPhotosRequest),
    ]);

    return {
      config: getConfigResponse.config,
      photos: getPhotosResponse.photos,
    };
  } catch (error) {
    throw new Error("データの取得に失敗しました。");
  }
}

export default function Photo() {
  const { config, photos } = useLoaderData<typeof loader>();
  const navigation = useNavigation();

  if (navigation.state === "loading") {
    return <div>Loading...</div>;
  }
  
  return (
    <main className="flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        <p>{config ? config.configPath : ''}</p>
        {photos.map((photo) => (
          <div key={photo.id} className="flex flex-col items-center gap-4">
            <p>{photo.generatedFilename}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
