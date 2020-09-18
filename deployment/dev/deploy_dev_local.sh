#!/usr/bin/bash

# PWD is the monorepo's root

pwd
yarn --pure-lockfile && \
yarn workspace @trulyacerbic/ttt-apis build && \
yarn workspace gmaster build && \
yarn workspace ghost build && \
sudo docker-compose \
    --project-name ttt-dev-local \
    --file deployment/dev/docker-compose-hasura-only.yml \
    up -d --build
