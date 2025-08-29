# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the Next.js application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Add non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/knexfile.js ./knexfile.js
COPY --from=builder /app/src/lib/migrations ./src/lib/migrations
COPY --from=builder /app/src/lib/seeds ./src/lib/seeds

# Create data directory for SQLite database with proper permissions
RUN mkdir -p data && \
    chmod 755 data && \
    chown -R nextjs:nodejs data

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Run database migrations with retry logic and start the application
CMD ["sh", "-c", "npm run db:migrate || (sleep 2 && npm run db:migrate) && npm start"]