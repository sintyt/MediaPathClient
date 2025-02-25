import { createClient } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { MediafileService } from "~/mediafile/v1/mediafile_pb";

// MediafileServiceでgRPCのクライアントを作成
// 環境変数からgRPCサーバのURLを取得
// const GRPC_BASE_URL = process.env.PUBLIC_GRPC_BASE_URL || "http://localhost:50051";
const GRPC_BASE_URL = "http://localhost:50051";

// gRPCのTransportを作成
const transport = createGrpcWebTransport({
  baseUrl: GRPC_BASE_URL,
});

export const MediafileGrpcClient = createClient(MediafileService, transport);
