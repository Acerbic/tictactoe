FROM node:lts-alpine as source
RUN apk add yarn
WORKDIR /app

# Source and dependency projects
COPY ["package.json", "yarn.lock", ".pnp.js", ".yarnrc.yml", "./"]
COPY .yarn ./.yarn
COPY packages/apis ./packages/apis
COPY packages/ghost ./packages/ghost

# parameters to run this Dockerfile
ARG GHOST_PORT=3060

# this rebuilds "unplugged" and other artifacts not commited to git
# NOTE: should've been yarn install --immutable, but it freezes, presumably
#       because not all packages in monorepo are being installed
RUN yarn install 
# compile project files
RUN yarn workspace @trulyacerbic/ttt-apis build
RUN yarn workspace ghost build

# Remove devDependencies
WORKDIR packages/ghost
RUN yarn prod-install /app-build

FROM node:lts-alpine
RUN apk add yarn
WORKDIR /app

# mix trimmed-down installation and compiled source code
COPY --from=source ["/app-build", "."]
COPY --from=source ["/app/packages/ghost/dist", "dist"]

# Container running conditions and command
ENV GHOST_PORT=$GHOST_PORT
CMD yarn start
EXPOSE $GHOST_PORT
