#!/usr/bin/bash

lerna bootstrap
PRISMA_URI=localhost:4466 lerna run build
sudo docker-compose --file deployment/docker-compose-prisma-only.yml up -d --build
