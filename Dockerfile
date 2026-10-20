# --- Build stage ---
FROM node:20-bookworm AS builder
WORKDIR /app

# Build deps only if you really need native modules
RUN apt-get update && apt-get install -y python3 make g++ libc6-dev pkg-config \
    libpixman-1-dev libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev

COPY package*.json ./

# Repro if lock exists; fallback for local convenience
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
# Copy the rest of the application into the image so Next.js can find `app`/`src`
# (copy after installing deps to leverage layer caching for node_modules)
COPY . .

# Build the app (inlines NEXT_PUBLIC_* into client bundle)
RUN npm run build

# Trim dev deps so node_modules is production-only when copied
RUN npm prune --production || true

# --- Runtime stage ---
FROM node:20-alpine AS runner
WORKDIR /app

# Minimal runtime libs (needed for some native modules on Alpine)
RUN apk add --no-cache libc6-compat

# Non-root user
RUN addgroup -S app && adduser -S -G app app

# Copy standalone server + static/public (slim runtime)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy the startup entrypoint that writes public/env.js at container start
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Ensure runtime assets are writable by the non-root runtime user `app`.
# This allows the entrypoint (which runs as `app`) to write ./public/env.js
RUN chown -R app:app /app/public /app/.next/static /app/node_modules || true


# Good defaults for prod
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

USER app


# Accept build argument
ARG APP_VERSION


# Set it as a permanent environment variable
ENV APP_VERSION=${APP_VERSION}


# Respect Azure's PORT; use the entrypoint which will prefer the standalone server
CMD ["./entrypoint.sh"]
