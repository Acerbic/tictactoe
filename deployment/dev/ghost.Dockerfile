FROM node:lts-alpine
RUN apk add yarn
WORKDIR /app

# Common dependencies among projects
COPY ["package.json", "yarn.lock", ".pnp.js", ".yarnrc.yml", "./"]
COPY .yarn ./.yarn
COPY packages/apis ./packages/apis

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
RUN yarn

# copy the rest
COPY packages/ghost ./packages/ghost

# compile TypeScript
RUN yarn workspace @trulyacerbic/ttt-apis build
RUN yarn workspace ghost build