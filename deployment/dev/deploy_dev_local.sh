#!/usr/bin/bash

# PWD should be the monorepo's root

yarn --pure-lockfile && \
yarn workspace @trulyacerbic/ttt-apis build && \
yarn workspace gmaster build && \
yarn workspace ghost build && \
sudo docker-compose \
    --project-name ttt-dev-local \
    --file deployment/dev/docker-compose-hasura-only.yml \
    up -d --build
