FROM node:lts-alpine
RUN apk add yarn
WORKDIR /app

# parameters to run this Dockerfile
ARG CLIENT_PORT=3030

# Container running conditions and command
ENV CLIENT_PORT=$CLIENT_PORT
EXPOSE $CLIENT_PORT
CMD ["yarn", "dev"]

# copying files and building the project
COPY ./packages/client .
COPY ["yarn.lock", "./"]
RUN yarn --pure-lockfile
RUN yarn build