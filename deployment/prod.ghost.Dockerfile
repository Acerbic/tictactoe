FROM node:lts-alpine as lerna
RUN apk add yarn && npm i lerna -g
WORKDIR /app

# Common dependencies among projects
COPY ["package.json", "yarn.lock", "./"]
RUN yarn --pure-lockfile

# install node_modules & crosslink
COPY ["packages/gamesdb/package.json", "./packages/gamesdb/"]
COPY ["packages/ghost/package.json", "./packages/ghost/"]
COPY lerna.json .
RUN lerna bootstrap -- --pure-lockfile

# copy the rest
COPY packages/gamesdb ./packages/gamesdb
COPY packages/ghost ./packages/ghost

# compile TypeScript
RUN lerna run build --scope="ghost"

# ---- remove dev files ---- #
RUN lerna clean -y && lerna bootstrap -- --production --pure-lockfile

FROM node:lts-alpine
WORKDIR /app

COPY --from=lerna ["/app", "./"]

CMD cd ./packages/ghost && npm run start
EXPOSE 3060