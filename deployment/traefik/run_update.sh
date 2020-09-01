#!/bin/bash

# create traefik custom network if not existing already
# check if exists first
EXISTING=$(docker network ls | grep "traefik_proxy")
if [ "$EXISTING" = "" ]; then
    docker network create traefik_proxy;
fi

# updates running containers to the newest version from docker registry
docker-compose pull
docker-compose up -d
docker image prune -f
