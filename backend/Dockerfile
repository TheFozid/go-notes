# Frontend build stage
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Backend builder stage
FROM golang:1.25-alpine AS backend-builder
WORKDIR /app
RUN apk add --no-cache git file
COPY backend/go.mod backend/go.sum ./
RUN go mod tidy
RUN go mod download
COPY backend/ .
# Copy frontend build output
COPY --from=frontend-builder /frontend/dist ./static
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o go-notes ./cmd/main.go
RUN file go-notes
RUN ls -al /app
# Add wait-for-it.sh script
ADD https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

# Final image
FROM alpine:latest
WORKDIR /app
# Install bash for wait-for-it.sh
RUN apk add --no-cache bash
# Copy built binary
COPY --from=backend-builder /app/go-notes .
# Copy migrations
COPY --from=backend-builder /app/internal/migrations /app/internal/migrations
# Copy static frontend files
COPY --from=backend-builder /app/static /app/static
# Copy wait-for-it.sh
COPY --from=backend-builder /wait-for-it.sh /wait-for-it.sh
RUN chmod +x /app/go-notes /wait-for-it.sh
CMD ["/wait-for-it.sh", "db:5432", "--", "/app/go-notes"]
