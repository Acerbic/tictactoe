FROM node:lts-alpine
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

# build dependence package
ARG PRISMA_URI=prisma:4466
RUN lerna run build --scope="@trulyacerbic/ttt-gamesdb"

# compile TypeScript
RUN lerna run build --scope="ghost"

CMD cd ./packages/ghost && yarn start

ARG GHOST_PORT=3060
ENV GHOST_PORT=$GHOST_PORT
EXPOSE $GHOST_PORT