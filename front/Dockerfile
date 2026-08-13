# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --include=optional

COPY . .

ARG NEXT_PUBLIC_URL
ENV NEXT_PUBLIC_URL=$NEXT_PUBLIC_URL

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --include=optional

COPY --from=builder /app/.next ./.next
COPY public ./public
COPY next.config.mjs ./next.config.mjs

EXPOSE 3000

CMD ["npm", "start"]
