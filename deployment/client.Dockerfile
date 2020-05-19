FROM node:lts-alpine

# parameters to run this Dockerfile
ARG CLIENT_PORT=3030

# yarn for lock file
RUN apk add yarn

WORKDIR /app
CMD ["yarn", "dev"]

# copying files and building the project
COPY ./packages/test_client .
COPY ["yarn.lock", "./"]
RUN yarn --pure-lockfile
RUN yarn build

# ENV variables injected into built container
ENV CLIENT_PORT=$CLIENT_PORT

# access to the container from outside
EXPOSE $CLIENT_PORT