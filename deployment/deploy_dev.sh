#!/usr/bin/bash

lerna bootstrap --scope="@trulyacerbic/ttt-gamesdb"
PRISMA_URI=prisma:4466 lerna run build --scope="@trulyacerbic/ttt-gamesdb"
sudo docker-compose --file deployment/docker-compose-dev.yml build
sudo docker-compose --file deployment/docker-compose-dev.yml up -d
