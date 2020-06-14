#!/usr/bin/bash

sudo docker-compose \
    --project-name ttt-dev-local \
    --file deployment/docker-compose-hasura-only.yml  \
    down
