#!/usr/bin/bash

sudo docker-compose \
    --project-name ttt-dev-local \
    --file deployment/dev/docker-compose-hasura-only.yml  \
    down
