#!/usr/bin/bash

### Build/push script for Travis CI (Docker containters)

# build new containers
docker-compose --file deployment/docker-compose-prod.yml build || exit 1
docker tag ttt/hasura $DOCKER_REGISTRY_ADDR/ttt/hasura
docker tag ttt/ghost-prod $DOCKER_REGISTRY_ADDR/ttt/ghost
docker tag ttt/gmaster-prod $DOCKER_REGISTRY_ADDR/ttt/gmaster

# push containers to the remote private Docker repo
echo "$DOCKER_REGISTRY_PASS" | docker login -u "travisci" --password-stdin $DOCKER_REGISTRY_ADDR
docker push $DOCKER_REGISTRY_ADDR/ttt/hasura
docker push $DOCKER_REGISTRY_ADDR/ttt/ghost
docker push $DOCKER_REGISTRY_ADDR/ttt/gmaster