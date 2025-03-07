// @generated by protoc-gen-connect-web v0.8.6 with parameter "import_extension=.js"
// @generated from file v1/mediapath.proto (package mediapath.v1, syntax proto3)
/* eslint-disable */
// @ts-nocheck

import { GetCamerasRequest, GetCamerasResponse, GetLogRequest, GetLogResponse, GetPhotosRequest, GetPhotosResponse, LoadCameraCacheRequest, LoadCameraCacheResponse, LoadLogRequest, LoadLogResponse, LoadPhotoCacheRequest, LoadPhotoCacheResponse, MovePhotosRequest, MovePhotosResponse, ReadConfigRequest, ReadConfigResponse, ReadFolderRequest, ReadFolderResponse, SaveCameraCacheRequest, SaveCameraCacheResponse, SaveLogRequest, SaveLogResponse, SavePhotoCacheRequest, SavePhotoCacheResponse, WriteConfigRequest, WriteConfigResponse } from "./mediapath_pb.js";
import { MethodKind } from "@bufbuild/protobuf";

/**
 * 
 *
 * @generated from service mediapath.v1.MediapathService
 */
export const MediapathService = {
  typeName: "mediapath.v1.MediapathService",
  methods: {
    /**
     * 
     *
     * @generated from rpc mediapath.v1.MediapathService.ReadFolder
     */
    readFolder: {
      name: "ReadFolder",
      I: ReadFolderRequest,
      O: ReadFolderResponse,
      kind: MethodKind.Unary,
    },
    /**
     * コンフィギュレーションを読み込みます。
     *
     * @generated from rpc mediapath.v1.MediapathService.ReadConfig
     */
    readConfig: {
      name: "ReadConfig",
      I: ReadConfigRequest,
      O: ReadConfigResponse,
      kind: MethodKind.Unary,
    },
    /**
     * コンフィギュレーションを保存します。
     *
     * @generated from rpc mediapath.v1.MediapathService.WriteConfig
     */
    writeConfig: {
      name: "WriteConfig",
      I: WriteConfigRequest,
      O: WriteConfigResponse,
      kind: MethodKind.Unary,
    },
    /**
     * 写真のキャッシュ情報を保存します。
     *
     * @generated from rpc mediapath.v1.MediapathService.SavePhotoCache
     */
    savePhotoCache: {
      name: "SavePhotoCache",
      I: SavePhotoCacheRequest,
      O: SavePhotoCacheResponse,
      kind: MethodKind.Unary,
    },
    /**
     * 写真のキャッシュ情報を読み込みます。
     *
     * @generated from rpc mediapath.v1.MediapathService.LoadPhotoCache
     */
    loadPhotoCache: {
      name: "LoadPhotoCache",
      I: LoadPhotoCacheRequest,
      O: LoadPhotoCacheResponse,
      kind: MethodKind.Unary,
    },
    /**
     * カメラのキャッシュ情報を保存します。
     *
     * @generated from rpc mediapath.v1.MediapathService.SaveCameraCache
     */
    saveCameraCache: {
      name: "SaveCameraCache",
      I: SaveCameraCacheRequest,
      O: SaveCameraCacheResponse,
      kind: MethodKind.Unary,
    },
    /**
     * カメラのキャッシュ情報を読み込みます。
     *
     * @generated from rpc mediapath.v1.MediapathService.LoadCameraCache
     */
    loadCameraCache: {
      name: "LoadCameraCache",
      I: LoadCameraCacheRequest,
      O: LoadCameraCacheResponse,
      kind: MethodKind.Unary,
    },
    /**
     * ログを存します。
     *
     * @generated from rpc mediapath.v1.MediapathService.SaveLog
     */
    saveLog: {
      name: "SaveLog",
      I: SaveLogRequest,
      O: SaveLogResponse,
      kind: MethodKind.Unary,
    },
    /**
     * ログを読み込みます。
     *
     * @generated from rpc mediapath.v1.MediapathService.LoadLog
     */
    loadLog: {
      name: "LoadLog",
      I: LoadLogRequest,
      O: LoadLogResponse,
      kind: MethodKind.Unary,
    },
    /**
     * 写真情報を取得します。
     *
     * @generated from rpc mediapath.v1.MediapathService.GetPhotos
     */
    getPhotos: {
      name: "GetPhotos",
      I: GetPhotosRequest,
      O: GetPhotosResponse,
      kind: MethodKind.Unary,
    },
    /**
     * 写真を移動します。
     *
     * @generated from rpc mediapath.v1.MediapathService.MovePhotos
     */
    movePhotos: {
      name: "MovePhotos",
      I: MovePhotosRequest,
      O: MovePhotosResponse,
      kind: MethodKind.Unary,
    },
    /**
     * カメラ情報を取得します。
     *
     * @generated from rpc mediapath.v1.MediapathService.GetCameras
     */
    getCameras: {
      name: "GetCameras",
      I: GetCamerasRequest,
      O: GetCamerasResponse,
      kind: MethodKind.Unary,
    },
    /**
     * ログを取得します。
     *
     * @generated from rpc mediapath.v1.MediapathService.GetLog
     */
    getLog: {
      name: "GetLog",
      I: GetLogRequest,
      O: GetLogResponse,
      kind: MethodKind.Unary,
    },
  }
};

