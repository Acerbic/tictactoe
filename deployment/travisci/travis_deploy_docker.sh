#!/bin/bash
set -ev

### Deploy script for Travis CI (Pushes Docker images, updates app)

# Push images to the remote private Docker repo
echo "$DOCKER_REGISTRY_PASS" | docker login -u "travisci" --password-stdin $DOCKER_REGISTRY_ADDR
docker push $DOCKER_REGISTRY_ADDR/ttt/hasura
docker push $DOCKER_REGISTRY_ADDR/ttt/ghost
docker push $DOCKER_REGISTRY_ADDR/ttt/gmaster

# Run update script to replace running containers with new pushed images
ssh $DOCKER_DEPLOY_USER@$DOCKER_DEPLOY_HOST "cd $DOCKER_DEPLOY_PATH; sudo /bin/bash $DOCKER_DEPLOY_PATH/run_update.sh"
