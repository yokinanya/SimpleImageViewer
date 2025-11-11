# 使用官方 Node.js 22 Alpine 镜像作为基础镜像
FROM node:22-alpine AS base

# 设置工作目录
WORKDIR /app

# 复制 package.json 和相关文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 构建阶段
FROM node:22-alpine AS builder

WORKDIR /app

# 复制 package.json 和安装所有依赖（包括开发依赖）
COPY package*.json ./
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM node:22-alpine AS runner

WORKDIR /app

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 创建示例图片目录
RUN mkdir -p ./public/images && chown -R nextjs:nodejs ./public/images

USER nextjs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动应用
CMD ["node", "server.js"]