# Build stage
FROM node:22-alpine AS build

WORKDIR /app

ARG NPM_TOKEN
COPY package.json package-lock.json ./
RUN printf "@coveritlabs:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=${NPM_TOKEN}\n" > .npmrc \
  && npm ci --ignore-scripts \
  && rm -f .npmrc

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
ARG NPM_TOKEN
RUN printf "@coveritlabs:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=${NPM_TOKEN}\n" > .npmrc \
  && npm ci --ignore-scripts --omit=dev \
  && rm -f .npmrc

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY --from=build /app/dist ./dist

EXPOSE 3000

USER node

CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
