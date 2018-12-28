FROM deployer:latest as deployer
FROM node:lts-alpine

RUN apk add yarn

EXPOSE 3000

WORKDIR /app
COPY ["package.json", "yarn.lock", "./"]
RUN yarn && \
#    yarn upgrade @trulyacerbic/ttt-gamesdb@latest && \
    yarn cache clean

COPY --from=deployer /app/generated/prisma-client ./db/prisma-client

COPY . .

CMD ["yarn", "start"]
