#!/usr/bin/bash

set -ev

# NOTE: JWT_SECRET must be defined outside!
# build and start the docker containers
sudo JWT_SECRET=$JWT_SECRET docker-compose \
    --project-name ttt-prod \
    --file deployment/docker-compose-prod.yml \
    up -d --build

# removing intermediate images
sudo docker image prune -f