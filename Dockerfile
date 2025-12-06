# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend - Use Go 1.25 with Debian
FROM golang:1.25-bookworm AS backend-builder
WORKDIR /app
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
COPY --from=frontend-builder /frontend/dist ./static
RUN CGO_ENABLED=0 GOOS=linux go build -o go-notes ./cmd

# Stage 3: Build YJS Server
FROM node:20-alpine AS yjs-builder
WORKDIR /app
COPY yjs-server/package*.json ./
RUN npm install --production
COPY yjs-server/*.js ./

# Stage 4: Final Backend Image
FROM debian:bookworm-slim AS backend
WORKDIR /app
RUN apt-get update && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=backend-builder /app/go-notes .
COPY --from=backend-builder /app/static ./static
COPY --from=backend-builder /app/internal/migrations /app/internal/migrations
RUN chmod +x /app/go-notes
EXPOSE 8060
CMD ["/app/go-notes"]

# Stage 5: Final YJS Image  
FROM node:20-alpine AS yjs
WORKDIR /app
COPY --from=yjs-builder /app .
RUN mkdir -p /data && chown -R node:node /data
USER node
EXPOSE 1234 1235
CMD ["node", "server.js"]
