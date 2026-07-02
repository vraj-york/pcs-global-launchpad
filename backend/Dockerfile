FROM node:20-alpine AS builder

WORKDIR /app

ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_RELEASE

# Copy package files and NestJS config
COPY package.json package-lock.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Copy Prisma schema and config (needed for prisma generate)
COPY prisma/ ./prisma/
COPY prisma.config.ts ./

# Single dependency install: skip husky prepare, generate Prisma client explicitly
RUN npm ci --ignore-scripts && npx prisma generate

ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public"

# Copy source code
COPY . .

# Build NestJS application and verify output
RUN npm run build && \
    echo "Build completed. Checking dist directory..." && \
    ls -la dist/ && \
    echo "Looking for main.js in dist/src..." && \
    (test -f dist/src/main.js || find dist -name "main.js" | head -1) || (echo "ERROR: main.js not found!" && exit 1)

# Upload source maps to Sentry when build args are provided (staging/uat CI)
RUN if [ -n "$SENTRY_AUTH_TOKEN" ] && [ -n "$SENTRY_ORG" ] && [ -n "$SENTRY_PROJECT" ] && [ -n "$SENTRY_RELEASE" ]; then \
      npm install --no-save @sentry/cli && \
      npx sentry-cli sourcemaps inject ./dist && \
      SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN SENTRY_ORG=$SENTRY_ORG \
      npx sentry-cli sourcemaps upload ./dist \
        --project="$SENTRY_PROJECT" \
        --release="$SENTRY_RELEASE"; \
    fi

# Remove source maps from production artifact
RUN find ./dist -name '*.map' -delete

# Drop dev dependencies; production stage reuses this node_modules tree
RUN npm prune --production && npm cache clean --force

# Production stage
FROM node:20-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Reuse pruned dependencies and build output from builder (no second npm ci)
COPY --from=builder --chown=nestjs:nodejs /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Prisma schema + migrations for ECS migration tasks (run-migrations-ecs.sh)
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/prisma.config.ts ./

# Create logs directory with proper permissions (before switching to non-root user)
# This is needed even though we disable file logging in production, as a safety measure
RUN mkdir -p logs && \
    chown -R nestjs:nodejs logs && \
    chmod 755 logs

# RDS SSL: bundle AWS RDS CA so DB connections verify the server certificate
RUN apk add --no-cache wget && \
    mkdir -p /app/certs && \
    wget -q -O /app/certs/rds-global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem && \
    apk del wget && \
    chown nestjs:nodejs /app/certs /app/certs/rds-global-bundle.pem && \
    chmod 644 /app/certs/rds-global-bundle.pem

# Verify dist/src/main.js exists (as root before switching user)
RUN echo "Verifying dist directory contents..." && \
    ls -la dist/ && \
    echo "Checking for main.js in dist/src..." && \
    test -f dist/src/main.js || (echo "ERROR: dist/src/main.js not found!" && find dist -name "main.js" || exit 1) && \
    echo "✅ Main file found"

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check endpoint (matches /health route in app.controller.ts)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start NestJS application
# NestJS preserves source directory structure, so main.js is in dist/src/main.js
CMD ["node", "dist/src/main.js"]
