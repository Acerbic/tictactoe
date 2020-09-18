FROM node:lts-alpine
RUN apk add yarn
WORKDIR /app

# Common dependencies among projects
COPY ["package.json", "yarn.lock", "./"]
COPY packages/apis ./packages/apis
RUN yarn --pure-lockfile
RUN yarn workspace @trulyacerbic/ttt-apis build

# parameters to run this Dockerfile
ARG GMASTER_PORT=3000

# Container running conditions and command
ENV GMASTER_PORT=$GMASTER_PORT
EXPOSE $GMASTER_PORT
CMD cd ./packages/gmaster && yarn start

# install deps for this package & crosslink
COPY ["packages/gmaster/package.json", "./packages/gmaster/"]
RUN yarn --pure-lockfile

# copy the rest of project's files
COPY packages/gmaster ./packages/gmaster

# build
RUN yarn workspace gmaster build