#!/bin/bash

# updates running containers to the newest version from docker registry
docker-compose pull
docker-compose up -d
