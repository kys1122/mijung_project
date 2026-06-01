import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Docker 멀티스테이지 빌드용 — .next/standalone 디렉토리로 self-contained 결과물 생성
  output: 'standalone',
};

export default nextConfig;
