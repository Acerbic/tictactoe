FROM node:lts-alpine as lerna
RUN apk add yarn && npm i lerna -g
WORKDIR /app

# Common dependencies among projects
COPY ["package.json", "yarn.lock", "./"]
RUN yarn --pure-lockfile

# install node_modules & crosslink
COPY ["packages/gamesdb/package.json", "packages/gamesdb/yarn.lock", "./packages/gamesdb/"]
COPY ["packages/gmaster/package.json", "packages/gmaster/yarn.lock", "./packages/gmaster/"]
COPY lerna.json .
RUN lerna bootstrap -- --pure-lockfile

# copy the rest
COPY packages/gamesdb ./packages/gamesdb
COPY packages/gmaster ./packages/gmaster

# compile TypeScript
RUN lerna run build --scope="gmaster"

# ---- remove dev files ---- #
RUN lerna clean -y && lerna bootstrap -- --production --pure-lockfile

FROM node:lts-alpine
WORKDIR /app

COPY --from=lerna ["/app", "./"]

CMD cd ./packages/gmaster && npm run start
EXPOSE 3000