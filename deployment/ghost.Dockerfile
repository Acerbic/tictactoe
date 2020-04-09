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
RUN lerna link

# copy the rest
COPY packages/ghost ./packages/ghost

# NOTE: seems like bootstrap doesn't scope to a single package
#       and installs all dependencies for all packages instead
RUN lerna bootstrap --scope="ghost" -- --pure-lockfile
# compile TypeScript
RUN lerna run build --scope="ghost"

CMD cd ./packages/ghost && yarn dev

ARG GHOST_PORT=3060
ENV GHOST_PORT=$GHOST_PORT
EXPOSE $GHOST_PORT
EXPOSE 9229