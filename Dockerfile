# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev for potential builds)
RUN npm ci

# Copy source code
COPY . .

# Production stage
FROM node:18-alpine
WORKDIR /app

# Create group and user for security
RUN addgroup -g 1000 nodejs && \
    adduser -D -u 1000 -G nodejs nodejs

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy source code
COPY . .

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the server
CMD ["npm", "start"]
