FROM node:lts-alpine
RUN apk add yarn
WORKDIR /app

# Common dependencies among projects
COPY ["package.json", "yarn.lock", ".pnp.js", ".yarnrc.yml", "./"]
COPY .yarn ./.yarn
COPY packages/apis ./packages/apis

# parameters to run this Dockerfile
ARG CLIENT_PORT=3030

# Container running conditions and command
ENV CLIENT_PORT=$CLIENT_PORT
EXPOSE $CLIENT_PORT
CMD cd ./packages/client && yarn dev

# install deps for this package & crosslink
COPY ["packages/client/package.json", "./packages/client/"]
RUN yarn
RUN yarn workspace @trulyacerbic/ttt-apis build

# copying files and building the project
COPY packages/client ./packages/client
# RUN yarn workspace client build