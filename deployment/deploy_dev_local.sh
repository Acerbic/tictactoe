#!/usr/bin/bash

yarn && \
yarn workspace @trulyacerbic/ttt-apis build && \
yarn workspace gmaster build && \
yarn workspace ghost build && \
sudo docker-compose --project-name ttt --file deployment/docker-compose-hasura-only.yml up -d --build
