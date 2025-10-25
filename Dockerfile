FROM node:18-alpine3.19 AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables for build
ARG NEXT_PUBLIC_OPENAI_API_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_COMPANY_DOMAIN

ENV NEXT_PUBLIC_OPENAI_API_KEY=$NEXT_PUBLIC_OPENAI_API_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_COMPANY_DOMAIN=$NEXT_PUBLIC_COMPANY_DOMAIN
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 50001

ENV PORT=50001
ENV HOSTNAME=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:50001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

CMD ["node", "server.js"]