#!/usr/bin/bash

# PWD is the monorepo's root

# build and start the docker containers
sudo docker-compose \
    --project-name ttt-dev \
    --file deployment/dev/docker-compose-dev.yml \
    --env-file deployment/dev/.env \
    up -d --build
