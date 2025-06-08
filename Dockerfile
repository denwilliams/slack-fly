# Use Node.js 22 LTS
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY setup.js ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S slack-fly -u 1001

# Change ownership
RUN chown -R slack-fly:nodejs /app
USER slack-fly

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["node", "src/index.js"]
