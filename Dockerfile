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
ARG NEXT_PUBLIC_FABRIC_API_URL
ARG NEXT_PUBLIC_FABRIC_WORKSPACE
ARG NEXT_PUBLIC_FABRIC_LAKEHOUSE
ARG NEXT_PUBLIC_OPENAI_API_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_COMPANY_DOMAIN

ENV NEXT_PUBLIC_FABRIC_API_URL=$NEXT_PUBLIC_FABRIC_API_URL
ENV NEXT_PUBLIC_FABRIC_WORKSPACE=$NEXT_PUBLIC_FABRIC_WORKSPACE
ENV NEXT_PUBLIC_FABRIC_LAKEHOUSE=$NEXT_PUBLIC_FABRIC_LAKEHOUSE
ENV NEXT_PUBLIC_OPENAI_API_KEY=$NEXT_PUBLIC_OPENAI_API_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_COMPANY_DOMAIN=$NEXT_PUBLIC_COMPANY_DOMAIN

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

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "192.168.181.226"

CMD ["node", "server.js"]