#!/bin/bash
set -ev

### Deploy script for Travis CI (pushes Docker containters, updates app)

# push containers to the remote private Docker repo
echo "$DOCKER_REGISTRY_PASS" | docker login -u "travisci" --password-stdin $DOCKER_REGISTRY_ADDR
docker push $DOCKER_REGISTRY_ADDR/ttt/hasura
docker push $DOCKER_REGISTRY_ADDR/ttt/ghost
docker push $DOCKER_REGISTRY_ADDR/ttt/gmaster

# update container startup files on remote
ssh -o StrictHostKeyChecking=no $DOCKER_DEPLOY_USERHOST "cd $DOCKER_DEPLOY_PATH; rm *"
rsync -r deployment/traefik $DOCKER_DEPLOY_USERHOST:$DOCKER_DEPLOY_PATH
ssh $DOCKER_DEPLOY_USERHOST "cd $DOCKER_DEPLOY_PATH; chmod o+x run_update.sh; ./run_update.sh"