# This directory

Contains files to lauch dev environment / dev builds

-   `*.Dockerfile` files are optimised for faster rebuild
-   `deploy_dev.sh`, `down_dev.sh` to run project in containers (closer to prod
    setup)
-   `deploy_dev_local.sh`, `down_dev_local.sh` to run only Hasura in container and
    other packages must be started in localhost as separate processes (see
    `project.json` for "start:\*" scripts)
