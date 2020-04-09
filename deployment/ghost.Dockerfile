FROM node:lts-alpine
RUN apk add yarn && npm i lerna -g
WORKDIR /app

# Common dependencies among projects
COPY ["package.json", "yarn.lock", "./"]
RUN yarn --pure-lockfile

# copy prebuilt @trulyacerbic/ttt-gamesdb & crosslink
COPY packages/gamesdb ./packages/gamesdb
COPY ["packages/ghost/package.json", "./packages/ghost/"]
COPY lerna.json .

# NOTE: seems like bootstrap doesn't scope to a single package
#       and installs all dependencies for all present workspaces
#       at the time - i.e. installs "ghost" and "@trulyacerbic/ttt-gamesdb"
RUN lerna bootstrap --scope="ghost" -- --pure-lockfile

# copy the rest
COPY packages/ghost ./packages/ghost

# compile TypeScript
RUN lerna run build --scope="ghost"

CMD cd ./packages/ghost && yarn dev

ARG GHOST_PORT=3060
ENV GHOST_PORT=$GHOST_PORT
EXPOSE $GHOST_PORT
EXPOSE 9229