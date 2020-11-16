#!/usr/bin/bash

# PWD should be the monorepo's root

yarn  && \
yarn workspace @trulyacerbic/ttt-apis build && \
sudo docker-compose \
    --project-name ttt-dev-local \
    --file deployment/dev/docker-compose-hasura-only.yml \
    up -d --build
