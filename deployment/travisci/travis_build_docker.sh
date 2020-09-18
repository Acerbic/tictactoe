#!/bin/bash
set -ev

### Build script for Travis CI (builds Docker containters)

# build new containers
docker-compose --file deployment/prod/docker-compose-prod.yml build
docker tag ttt/hasura $DOCKER_REGISTRY_ADDR/ttt/hasura
docker tag ttt/ghost-prod $DOCKER_REGISTRY_ADDR/ttt/ghost
docker tag ttt/gmaster-prod $DOCKER_REGISTRY_ADDR/ttt/gmaster