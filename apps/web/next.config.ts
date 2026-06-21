import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Plugin de next-intl: enlaza la configuración de src/i18n/request.ts
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
