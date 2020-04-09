#!/usr/bin/bash

# pre-build @trulyacerbic/ttt-gamesdb outside of containers to prevent repeatings
lerna bootstrap --scope="@trulyacerbic/ttt-gamesdb" && \
lerna run build --scope="@trulyacerbic/ttt-gamesdb" && \
# build and start the docker containers
sudo docker-compose --file deployment/docker-compose-dev.yml build && \
sudo docker-compose --file deployment/docker-compose-dev.yml up -d
