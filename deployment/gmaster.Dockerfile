FROM node:lts-alpine
RUN apk add yarn && npm i lerna -g
WORKDIR /app

# Common dependencies among projects
COPY ["package.json", "yarn.lock", "./"]
RUN yarn --pure-lockfile

# copy prebuilt @trulyacerbic/ttt-gamesdb & crosslink
COPY packages/gamesdb ./packages/gamesdb
COPY ["packages/gmaster/package.json", "./packages/gmaster/"]
COPY lerna.json .

# copy the rest
COPY packages/gmaster ./packages/gmaster
RUN lerna link

# NOTE: seems like bootstrap doesn't scope to a single package
#       and installs all dependencies for all packages instead
RUN lerna bootstrap --scope="gmaster" -- --pure-lockfile
# compile TypeScript
RUN lerna run build --scope="gmaster"

CMD cd ./packages/gmaster && yarn start

ARG GMASTER_PORT=3000
ENV GMASTER_PORT=$GMASTER_PORT
EXPOSE $GMASTER_PORT