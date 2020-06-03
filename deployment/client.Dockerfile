FROM node:lts-alpine
RUN apk add yarn && npm i lerna -g
WORKDIR /app

# Common dependencies among projects
COPY ["package.json", "lerna.json", "yarn.lock", "./"]
RUN yarn --pure-lockfile

# parameters to run this Dockerfile
ARG CLIENT_PORT=3030

# Container running conditions and command
ENV CLIENT_PORT=$CLIENT_PORT
EXPOSE $CLIENT_PORT
CMD cd ./packages/client && yarn dev

# copy prebuilt @trulyacerbic/ttt-apis & crosslink
COPY packages/apis ./packages/apis
COPY ["packages/client/package.json", "./packages/client/"]

RUN lerna bootstrap --scope="@trulyacerbic/ttt-client" -- --pure-lockfile

# copying files and building the project
COPY packages/client ./packages/client
# RUN lerna run build --scope="@trulyacerbic/ttt-client"