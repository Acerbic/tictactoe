FROM node:lts-alpine
RUN apk add yarn
WORKDIR /app

# Common dependencies among projects
COPY ["package.json", "yarn.lock", "./"]
COPY packages/apis ./packages/apis
RUN yarn --pure-lockfile
RUN yarn workspace @trulyacerbic/ttt-apis build

# parameters to run this Dockerfile
ARG GHOST_PORT=3060

# Container running conditions and command
ENV GHOST_PORT=$GHOST_PORT
EXPOSE $GHOST_PORT
# Node.js debugger access
EXPOSE 9229
CMD cd ./packages/ghost && yarn dev

# install deps for this package & crosslink
COPY ["packages/ghost/package.json", "./packages/ghost/"]
RUN yarn --pure-lockfile

# copy the rest
COPY packages/ghost ./packages/ghost

# compile TypeScript
RUN yarn workspace ghost build