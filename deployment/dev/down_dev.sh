#!/usr/bin/bash

sudo docker-compose \
    --project-name ttt-dev \
    --file deployment/dev/docker-compose-dev.yml \
    down
