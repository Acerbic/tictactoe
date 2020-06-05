#!/usr/bin/bash

# build and start the docker containers
sudo docker-compose --file deployment/docker-compose-dev.yml build && \

# the container for hasura (graphql-engine) depends on
# migrations and metadata folders mounted as volumes, so isn't fully
# self-sufficient.
sudo docker-compose --file deployment/docker-compose-dev.yml up -d
