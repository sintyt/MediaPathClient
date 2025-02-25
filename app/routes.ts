import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("photo", "routes/photo.tsx"),
] satisfies RouteConfig;
