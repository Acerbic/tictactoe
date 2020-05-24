#!/usr/bin/bash

# pre-build @trulyacerbic/ttt-apis outside of containers to prevent repeatings
lerna bootstrap --scope="@trulyacerbic/ttt-apis" && \
lerna run build --scope="@trulyacerbic/ttt-apis" && \
# build and start the docker containers
sudo docker-compose --file deployment/docker-compose-dev.yml build && \

# the container for hasura (graphql-engine) depends on
# migrations and metadata folders mounted as volumes, so isn't fully
# self-sufficient.
sudo docker-compose --file deployment/docker-compose-dev.yml up -d
