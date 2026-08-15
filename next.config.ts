import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 私有 TS 包，需显式转译
  transpilePackages: ["@zmzai/db", "@zmzai/theme"],
  webpack: (config) => {
    // theme 源码直发（NodeNext .js 后缀 import），映射回 .ts 让 webpack 解析
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};
export default nextConfig;
