FROM node:lts-alpine as source
RUN apk add yarn
WORKDIR /app

# parameters to run this Dockerfile
ARG GMASTER_PORT=3000

# Source and dependency projects
COPY ["package.json", "yarn.lock", "./"]
COPY packages/apis ./packages/apis
COPY packages/gmaster ./packages/gmaster

# install packages and compile
RUN yarn --frozen-lockfile --non-interactive
RUN yarn workspace @trulyacerbic/ttt-apis build
RUN yarn workspace gmaster build

# Remove devDependencies
RUN yarn --production --frozen-lockfile --non-interactive

FROM node:lts-alpine
WORKDIR /app

COPY --from=source ["/app/packages/gmaster/dist", "packages/gmaster/dist"]
COPY --from=source ["/app/packages/gmaster/bin", "packages/gmaster/bin"]
COPY --from=source ["/app/packages/gmaster/node_modules", "packages/gmaster/node_modules"]
COPY --from=source ["/app/packages/gmaster/package.json", "packages/gmaster"]
COPY --from=source ["/app/node_modules", "./node_modules"]

# Container running conditions and command
ENV GMASTER_PORT=$GMASTER_PORT
CMD cd ./packages/gmaster && npm run start
EXPOSE $GMASTER_PORT