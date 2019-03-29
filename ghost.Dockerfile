FROM node:lts-alpine
RUN apk add yarn && npm i lerna -g
WORKDIR /app

# Common dependencies among projects
COPY ["package.json", "yarn.lock", "./"]
RUN yarn --pure-lockfile

# install node_modules & crosslink
COPY ["packages/gamesdb/package.json", "packages/gamesdb/yarn.lock", "./packages/gamesdb/"]
COPY ["packages/ghost/package.json", "packages/ghost/yarn.lock", "./packages/ghost/"]
COPY lerna.json .
RUN lerna bootstrap

# copy the rest
COPY packages/gamesdb ./packages/gamesdb
COPY packages/ghost ./packages/ghost

# compile TypeScript
RUN lerna run build --scope="ghost"

CMD cd ./packages/ghost && yarn start
EXPOSE 3060