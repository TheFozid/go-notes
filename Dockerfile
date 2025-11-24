# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM golang:1.25-alpine AS backend-builder
WORKDIR /app
RUN apk add --no-cache git
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
COPY --from=frontend-builder /frontend/dist ./static
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o go-notes ./cmd

# Stage 3: Build YJS Server
FROM node:20-alpine AS yjs-builder
WORKDIR /app
COPY yjs-server/package*.json ./
RUN npm install --production
COPY yjs-server/*.js ./

# Stage 4: Final Backend Image
FROM alpine:latest AS backend
WORKDIR /app
RUN apk add --no-cache bash curl
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
