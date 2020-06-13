#!/usr/bin/bash

# build and start the docker containers
sudo docker-compose \
    --project-name ttt \
    --file deployment/docker-compose-dev.yml \
    --env-file deployment/dev.env \
    up -d --build
