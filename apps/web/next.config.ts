import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Plugin de next-intl: enlaza la configuración de src/i18n/request.ts
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Salida autocontenida para una imagen de producción mínima (server.js + lo justo).
  output: 'standalone',
};

export default withNextIntl(nextConfig);
