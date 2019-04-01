FROM node:lts-alpine

# yarn for lock file
RUN apk add yarn

WORKDIR /app
COPY ["./packages/test_client/package.json", "./packages/test_client/yarn.lock", "./"]
CMD ["yarn", "start"]

# installing prisma for "prisma deploy" later
RUN yarn --pure-lockfile && yarn cache clean

# copying prisma datamodel and prisma.yml
COPY ./packages/test_client .
RUN yarn build

ARG CLIENT_PORT=3030
ENV CLIENT_PORT=$CLIENT_PORT
EXPOSE $CLIENT_PORT