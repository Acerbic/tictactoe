FROM deployer:latest as deployer
FROM node:lts-alpine

RUN apk add yarn

EXPOSE 3060

WORKDIR /app
COPY ["package.json", "yarn.lock", "./"]
RUN yarn && \
    yarn cache clean

COPY --from=deployer /app/generated/prisma-client ./connectors/prisma-client

COPY . .

CMD ["yarn", "start"]
