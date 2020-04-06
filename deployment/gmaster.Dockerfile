FROM node:lts-alpine
RUN apk add yarn && npm i lerna -g
WORKDIR /app

# Common dependencies among projects
COPY ["package.json", "yarn.lock", "./"]
RUN yarn --pure-lockfile

# install node_modules & crosslink
COPY ["packages/gamesdb/package.json", "./packages/gamesdb/"]
COPY ["packages/gmaster/package.json", "./packages/gmaster/"]
COPY lerna.json .
RUN lerna bootstrap -- --pure-lockfile

# copy the rest
COPY packages/gamesdb ./packages/gamesdb
COPY packages/gmaster ./packages/gmaster

# build dependence package
ARG PRISMA_URI=prisma:4466
RUN lerna run build --scope="@trulyacerbic/ttt-gamesdb"

# compile TypeScript
RUN lerna run build --scope="gmaster"

CMD cd ./packages/gmaster && yarn start

ARG GMASTER_PORT=3000
ENV GMASTER_PORT=$GMASTER_PORT
EXPOSE $GMASTER_PORT