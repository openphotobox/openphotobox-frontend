# Build Stage

FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies needed for native builds
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with optimizations
# - ci is faster and uses package-lock.json
# - omit=dev skips devDependencies in final install
# - prefer-offline uses cache when available
RUN npm ci --prefer-offline --no-audit --legacy-peer-deps

# Copy source files
COPY . ./

# Build the application
RUN npm run build

# Runtime Stage

FROM node:22-alpine
WORKDIR /app

# Only `.output` folder is needed from the build stage
COPY --from=build /app/.output/ ./

# Runtime environment variables
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NUXT_PUBLIC_API_BASE=http://localhost:8000

# Expose the application port
EXPOSE 3000

CMD ["node", "server/index.mjs"]
