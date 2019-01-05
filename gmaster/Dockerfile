FROM deployer:latest as deployer
FROM node:lts-alpine

RUN apk add yarn

EXPOSE 3000

WORKDIR /app
COPY ["package.json", "yarn.lock", "./"]
RUN yarn && \
    yarn cache clean

COPY . .
COPY --from=deployer /app/generated/prisma-client ./dist/db/prisma-client

RUN yarn build; exit 0

CMD ["yarn", "start"]
