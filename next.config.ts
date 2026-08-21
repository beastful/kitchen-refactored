import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Приложение живёт в подпапке /constructor3d/ на том же сервере, что и сайт.
  // basePath префиксует _next-чанки; ассеты в коде используют относительные пути.
  basePath: '/constructor3d',
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
