# Build stage
FROM node:24-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
# why is npm ci not working?
RUN npm install

COPY src/ ./src/
COPY examples/ ./examples/
RUN npm run build

# Production stage
FROM node:24-alpine AS production

WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./

# Install only production dependencies
# why is npm ci not working?
RUN npm install --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 slack-fly

# Change ownership
RUN chown -R slack-fly:nodejs /app
USER slack-fly

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["node", "dist/main.js"]
