FROM node:lts-alpine
RUN apk add yarn
WORKDIR /app

# Common dependencies among projects
COPY ["package.json", "yarn.lock", ".pnp.js", ".yarnrc.yml", "./"]
COPY .yarn ./.yarn
COPY packages/apis ./packages/apis

# parameters to run this Dockerfile
ARG GMASTER_PORT=3000

# Container running conditions and command
ENV GMASTER_PORT=$GMASTER_PORT
EXPOSE $GMASTER_PORT
CMD cd ./packages/gmaster && yarn dev

# install deps for this package & crosslink
COPY ["packages/gmaster/package.json", "./packages/gmaster/"]
RUN yarn

# copy the rest of project's files
COPY packages/gmaster ./packages/gmaster

# build
RUN yarn workspace @trulyacerbic/ttt-apis build
RUN yarn workspace gmaster build