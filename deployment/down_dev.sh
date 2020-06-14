#!/usr/bin/bash

sudo docker-compose \
    --project-name ttt-dev \
    --file deployment/docker-compose-dev.yml \
    down