FROM node:lts-alpine
RUN apk add yarn
WORKDIR /app

# Common dependencies among projects
COPY ["package.json", "yarn.lock", "./"]
COPY packages/apis ./packages/apis
RUN yarn --pure-lockfile
RUN yarn workspace @trulyacerbic/ttt-apis build

# parameters to run this Dockerfile
ARG CLIENT_PORT=3030

# Container running conditions and command
ENV CLIENT_PORT=$CLIENT_PORT
EXPOSE $CLIENT_PORT
CMD cd ./packages/client && yarn dev

# install deps for this package & crosslink
COPY ["packages/client/package.json", "./packages/client/"]
RUN yarn --pure-lockfile

# copying files and building the project
COPY packages/client ./packages/client
# RUN yarn workspace client build