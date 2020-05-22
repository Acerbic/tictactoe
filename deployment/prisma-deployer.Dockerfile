FROM node:lts-alpine
RUN apk add yarn
WORKDIR /app

# parameters to run this Dockerfile
ARG PRISMA_HOSTPORT=prisma:4466

# Container running conditions and command
ENV PRISMA_HOSTPORT=${PRISMA_HOSTPORT}
ENV PRISMA_URL=http://${PRISMA_HOSTPORT}
CMD ["bash", "-c", "./wait-for-it.sh $PRISMA_HOSTPORT -s -t 0 -- yarn prisma deploy"]

# need bash for the wait script
RUN apk add bash
COPY ["./packages/gamesdb/package.json", "./"]
# installing prisma for "prisma deploy" later
RUN yarn --pure-lockfile && yarn cache clean
# copying prisma datamodel and prisma.yml
COPY ./packages/gamesdb .