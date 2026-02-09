FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/.next ./.next
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
