FROM deployer:latest as deployer
FROM node:lts-alpine

RUN apk add yarn

EXPOSE 3000

WORKDIR /app
COPY ["package.json", "yarn.lock", "./"]
# install devDeps for TS compilations
RUN yarn --production=false && \
    yarn cache clean


COPY . .
COPY --from=deployer /app/generated/prisma-ts-client ./src/db/prisma-client

# compile TypeScript
RUN yarn build

CMD ["yarn", "start"]