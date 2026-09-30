FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./
COPY src ./src

ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dhaka_tesla_pool

RUN npx prisma generate

RUN npm run build

EXPOSE 5000

CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && npm start"]
