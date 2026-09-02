# 루트에서 빌드: docker build -f apps/web/Dockerfile --build-arg VITE_KAKAO_JS_KEY=... .
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter web
COPY apps/web apps/web
# VITE_ 값은 빌드 시점에 번들에 박힌다. 서버 .env가 아니라 CI secret에서 주입
ARG VITE_KAKAO_JS_KEY
ENV VITE_KAKAO_JS_KEY=$VITE_KAKAO_JS_KEY VITE_API_BASE=/api
RUN pnpm --filter web build

FROM nginx:alpine
COPY apps/web/deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
