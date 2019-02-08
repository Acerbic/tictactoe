FROM node:lts-alpine as lerna
RUN apk add yarn && npm i lerna -g
WORKDIR /app

# Common dependencies among projects
COPY ["package.json", "yarn.lock", "./"]
RUN yarn 

# install node_modules & crosslink
COPY ["packages/gamesdb/package.json", "./packages/gamesdb/"]
COPY ["packages/ghost/package.json", "./packages/ghost/"]
COPY lerna.json .
RUN lerna bootstrap --ignore-scripts

# post-install tasks
COPY packages/gamesdb ./packages/gamesdb
RUN lerna run postinstall --scope=@trulyacerbic/ttt-gamesdb
COPY packages/ghost ./packages/ghost
RUN lerna run postinstall --scope=ghost

# compile TypeScript
RUN cd ./packages/ghost && yarn build

CMD cd ./packages/ghost && yarn start
EXPOSE 3060


# ---- remove dev files ---- #
RUN lerna clean -y && lerna bootstrap --ignore-scripts -- --production

FROM node:lts-alpine
WORKDIR /app

COPY --from=lerna ["/app", "./"]

CMD cd ./packages/ghost && yarn start
EXPOSE 3060