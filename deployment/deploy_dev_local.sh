#!/usr/bin/bash

lerna bootstrap && \
lerna run build && \
sudo docker-compose --file deployment/docker-compose-hasura-only.yml up -d --build
