#!/usr/bin/bash

sudo docker-compose \
    --project-name ttt-prod \
    --file deployment/docker-compose-prod.yml \
    down