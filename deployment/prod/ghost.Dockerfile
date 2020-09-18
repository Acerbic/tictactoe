FROM node:lts-alpine as source
RUN apk add yarn
WORKDIR /app

# parameters to run this Dockerfile
ARG GHOST_PORT=3060

# Source and dependency projects
COPY ["package.json", "yarn.lock", "./"]
COPY packages/apis ./packages/apis
COPY packages/ghost ./packages/ghost

# install packages and compile
RUN yarn --pure-lockfile
RUN yarn workspace @trulyacerbic/ttt-apis build
RUN yarn workspace ghost build

# Remove devDependencies
RUN yarn --production --pure-lockfile

FROM node:lts-alpine
WORKDIR /app

COPY --from=source ["/app/packages/ghost/dist", "packages/ghost/dist"]
COPY --from=source ["/app/packages/ghost/node_modules", "packages/ghost/node_modules"]
COPY --from=source ["/app/packages/ghost/package.json", "packages/ghost"]
COPY --from=source ["/app/node_modules", "./node_modules"]

# Container running conditions and command
ENV GHOST_PORT=$GHOST_PORT
CMD cd ./packages/ghost && npm run start
EXPOSE $GHOST_PORT
