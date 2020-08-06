#!/bin/bash
set -ev

# Should be run from the root of the project
# triggers build and deploy on Zeit Now (uses .nowignore and now.json to
# configure what is to upload and what is to build)

if [ "$TRAVIS_PULL_REQUEST" = "false" ] && [ "$TRAVIS_BRANCH" = "master" ] ;
then 

    # Unfortunately, we have to use the stupid "Project Linking" feature, hence the
    # '--confirm' arg. Need 'name' key in `now.json` file, but since it was declared
    # deprecated and no alternative provided, this deploy flow can break at any time
    # in the future.
    echo "Now: deploying to production"
    now -b GHOST_URL=$GHOST_URL --token $ZEIT_NOW_TOKEN --confirm --prod
else
    echo "Now: deploying to staging"
    now -b GHOST_URL=$GHOST_URL --token $ZEIT_NOW_TOKEN --confirm
fi