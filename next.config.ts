import type { NextConfig } from 'next';

const SHADER_EXTENSIONS = ['vert', 'frag', 'glsl'] as const;

const shaderRules = Object.fromEntries(
  SHADER_EXTENSIONS.map((extension) => [
    `*.${extension}`,
    { loaders: ['raw-loader'], as: '*.js' },
  ]),
);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  turbopack: {
    rules: shaderRules,
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.(vert|frag|glsl)$/,
      type: 'asset/source',
    });
    return config;
  },
};

export default nextConfig;
