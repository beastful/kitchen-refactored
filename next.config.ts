import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Приложение живёт в подпапке /constructor3d/ на том же сервере, что и сайт.
  // basePath префиксует _next-чанки; ассеты в коде используют относительные пути.
  basePath: '/constructor3d',
  // Всегда отдавать страницу с завершающим слэшем (/constructor3d/): относительные
  // пути к ассетам (assets/, previews/, modules/) резолвятся от текущего URL, и без
  // слэша они уходят в корень сайта (/assets/...) и ломают 3D-сцену (404 → краш Canvas).
  trailingSlash: true,
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
