# QuizMaster Dockerfile - Node.js + Express.js + EJS + PostgreSQL + Socket.IO
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S quizmaster -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY --chown=quizmaster:nodejs . .

# Create necessary directories
RUN mkdir -p public/uploads && \
    mkdir -p logs && \
    chown -R quizmaster:nodejs /app

# Switch to non-root user
USER quizmaster

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "app.js"]