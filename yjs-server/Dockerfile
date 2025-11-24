FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY server.js auth.js createDefaultContent.js ./

# Create persistence directory
RUN mkdir -p /data && chown -R node:node /data

# Switch to non-root user
USER node

# Expose WebSocket port (internal only)
EXPOSE 1234 1235

CMD ["node", "server.js"]
