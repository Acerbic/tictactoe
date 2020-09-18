#!/usr/bin/bash

# PWD is the monorepo's root

sudo docker-compose \
    --project-name ttt-prod \
    --file deployment/prod/docker-compose-prod.yml \
    down
