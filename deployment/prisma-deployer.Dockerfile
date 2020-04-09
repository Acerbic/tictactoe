FROM node:lts-alpine

# yarn for lock file
RUN apk add yarn

# need bash for the wait script
RUN apk add bash
ARG PRISMA_HOSTPORT=prisma:4466
ENV PRISMA_HOSTPORT=${PRISMA_HOSTPORT}
ENV PRISMA_URL=http://${PRISMA_HOSTPORT}
CMD ["bash", "-c", "./wait-for-it.sh $PRISMA_HOSTPORT -s -t 0 -- npx prisma deploy"]

WORKDIR /app
COPY ["./packages/gamesdb/package.json", "./"]
# installing prisma for "prisma deploy" later
RUN yarn --pure-lockfile && yarn cache clean

# copying prisma datamodel and prisma.yml
COPY ./packages/gamesdb .