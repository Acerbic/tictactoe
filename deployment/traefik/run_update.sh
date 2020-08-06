#!/bin/bash

# create traefik custom network if not existing already
# TODO: check if exists first
docker network create traefik_proxy

# updates running containers to the newest version from docker registry
docker-compose pull
docker-compose up -d
docker image prune -f
