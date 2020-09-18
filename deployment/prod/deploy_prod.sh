#!/usr/bin/bash

# PWD is the monorepo's root

# build and start the docker containers
sudo JWT_SECRET=1234567 docker-compose \
    --project-name ttt-prod \
    --file deployment/prod/docker-compose-prod.yml \
    up -d --build

# removing intermediate images
sudo docker image prune -f
