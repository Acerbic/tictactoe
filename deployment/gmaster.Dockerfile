FROM node:lts-alpine
RUN apk add yarn && npm i lerna -g
WORKDIR /app

# parameters to run this Dockerfile
ARG GMASTER_PORT=3000

# Container running conditions and command
ENV GMASTER_PORT=$GMASTER_PORT
EXPOSE $GMASTER_PORT
CMD cd ./packages/gmaster && yarn start

# Common dependencies among projects
COPY ["package.json", "yarn.lock", "./"]
RUN yarn --pure-lockfile

# copy prebuilt @trulyacerbic/ttt-gamesdb, @trulyacerbic/ttt-apis & crosslink
COPY packages/gamesdb ./packages/gamesdb
COPY packages/apis ./packages/apis
COPY ["packages/gmaster/package.json", "./packages/gmaster/"]
COPY lerna.json .

# NOTE: seems like bootstrap doesn't scope to a single package
#       and installs all dependencies for all present workspaces
#       at the time - i.e. installs "gmaster" and "@trulyacerbic/ttt-gamesdb"
RUN lerna bootstrap --scope="gmaster" -- --pure-lockfile

# copy the rest
COPY packages/gmaster ./packages/gmaster

# compile TypeScript
RUN lerna run build --scope="gmaster"