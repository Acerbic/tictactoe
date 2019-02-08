FROM node:lts-alpine as lerna
RUN apk add yarn && npm i lerna -g
WORKDIR /app

# Common dependencies among projects
COPY ["package.json", "yarn.lock", "./"]
RUN yarn 

# install node_modules & crosslink
COPY ["packages/gamesdb/package.json", "./packages/gamesdb/"]
COPY ["packages/gmaster/package.json", "./packages/gmaster/"]
COPY lerna.json .
RUN lerna bootstrap --ignore-scripts

# post-install tasks
COPY packages/gamesdb ./packages/gamesdb
RUN lerna run postinstall --scope=@trulyacerbic/ttt-gamesdb
COPY packages/gmaster ./packages/gmaster
RUN lerna run postinstall --scope=gmaster

# compile TypeScript
RUN cd ./packages/gmaster && yarn build

CMD cd ./packages/gmaster && yarn start
EXPOSE 3000


# ---- remove dev files ---- #
RUN lerna clean -y && lerna bootstrap --ignore-scripts -- --production

FROM node:lts-alpine
WORKDIR /app

COPY --from=lerna ["/app", "./"]

CMD cd ./packages/gmaster && yarn start
EXPOSE 3000