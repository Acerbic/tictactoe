#!/bin/bash
set -ev

### Deploy script for Travis CI (Pushes Docker images, updates app)

# Push images to the remote private Docker repo
echo "$DOCKER_REGISTRY_PASS" | docker login -u "travisci" --password-stdin $DOCKER_REGISTRY_ADDR
docker push $DOCKER_REGISTRY_ADDR/ttt/hasura
docker push $DOCKER_REGISTRY_ADDR/ttt/ghost
docker push $DOCKER_REGISTRY_ADDR/ttt/gmaster

# # update container startup files on remote
# ssh -o StrictHostKeyChecking=no $DOCKER_DEPLOY_USER@$DOCKER_DEPLOY_HOST "cd $DOCKER_DEPLOY_PATH; rm *"
# rsync -r deployment/traefik/ $DOCKER_DEPLOY_USER@$DOCKER_DEPLOY_HOST:$DOCKER_DEPLOY_PATH

# # generate configuration for Traefik / Docker Compose
# echo "JWT_SECRET=$JWT_SECRET" > deployment/traefik/.env
# echo "DOCKER_REGISTRY=$DOCKER_REGISTRY_ADDR" >> deployment/traefik/.env
# echo "HOST_BASE_DOMAIN=$TRAEFIK_DOMAIN_BASE" >> deployment/traefik/.env
# rsync deployment/traefik/.env $DOCKER_DEPLOY_USER@$DOCKER_DEPLOY_HOST:$DOCKER_DEPLOY_PATH/.env

# Run update script to replace running containers with new pushed images
ssh $DOCKER_DEPLOY_USER@$DOCKER_DEPLOY_HOST "cd $DOCKER_DEPLOY_PATH; ./run_update.sh"
