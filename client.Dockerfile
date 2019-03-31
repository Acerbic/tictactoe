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
EXPOSE 3030