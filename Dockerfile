# syntax=docker/dockerfile:1.6
# mijung_project — Next.js 16 (App Router) 도커 이미지
# 멀티스테이지 빌드: deps → builder → runner
# 최종 이미지 크기: ~150MB (Alpine 기반)

# ── 1) deps: 의존성 설치 ───────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# 빌드 시 react-compiler 등이 swc 네이티브 바이너리를 받으므로 libc6-compat 필요
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci


# ── 2) builder: Next.js 프로덕션 빌드 ─────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* 변수는 빌드 시점에 클라이언트 번들에 박힘.
# 따라서 runtime ENV로 주입해도 의미 없고, 반드시 build arg로 받아야 함.
ARG NEXT_PUBLIC_AI_API_URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_AI_API_URL=$NEXT_PUBLIC_AI_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build


# ── 3) runner: 최소 런타임 이미지 ─────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# non-root 사용자 (보안)
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# standalone 출력물(서버.js + 최소 node_modules) 복사
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# i18n 디스크 캐시 디렉토리 (볼륨 마운트 시 권한 문제 방지)
RUN mkdir -p /app/.cache/i18n && chown -R nextjs:nodejs /app/.cache

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
