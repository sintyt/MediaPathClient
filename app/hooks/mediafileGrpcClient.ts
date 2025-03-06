import { createClient } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { MediapathService } from "~/grpc/v1/mediapath_pb";

// MediafileServiceでgRPCのクライアントを作成
// 環境変数からgRPCサーバのURLを取得
// const GRPC_BASE_URL = process.env.PUBLIC_GRPC_BASE_URL || "http://localhost:50051";
const GRPC_BASE_URL = "http://localhost:50051";

// gRPCのTransportを作成
const transport = createGrpcWebTransport({
  baseUrl: GRPC_BASE_URL,
});

export const mediafileGrpcClient = createClient(MediapathService, transport);
