#!/usr/bin/bash

# Should be run from the root of the project
# triggers build and deploy on Zeit Now (uses .nowignore and now.json to
# configure what is to upload and what is to build)
now -b GHOST_URL=$GHOST_URL 