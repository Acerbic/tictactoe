#!/bin/bash

### Build script for Travis CI (builds Docker containters)

# create cached directory if one doesn't exist (after caches purged or first
# build)
if [ ! -d $HOME/docker ]; then
  mkdir $HOME/docker
fi

# load layers from cached archive (Travis provides the caching for archive)
if [ -f $HOME/docker/layers.tar.gz ]; then
  gzip -dc $HOME/docker/layers.tar.gz | docker load
fi

# build new containers
docker-compose --file deployment/prod/docker-compose-prod.yml build

# archive built layers into a file
docker save $(docker image ls -aq) | gzip > $HOME/docker/layers.tar.gz
echo "Cached docker size:"
du -h $HOME/docker

# tag to push to a custom Docker Registry
docker tag ttt/hasura $DOCKER_REGISTRY_ADDR/ttt/hasura
docker tag ttt/ghost-prod $DOCKER_REGISTRY_ADDR/ttt/ghost
docker tag ttt/gmaster-prod $DOCKER_REGISTRY_ADDR/ttt/gmaster
