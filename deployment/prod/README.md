# This directory

Contains files to build production version the project. The build is longer but
resulting images are leaner.

`deploy_prod.sh` and `down_prod.sh` build and run production versions of
containers. While actual deployment tools don't run these scripts (see
`deployment/travisci`), they can be used to verify that production images can be
built without errors.

Unlike dev docker-compose file, the `docker-compose-prod.yml` doesn't build or
run a container for Tictactoe's "client" package (website server). Start a
client separately if you want to use it to actually play the game:

```bash
yarn start:client
```

Since Yarn v2 dropped some functionality Yarn v1 had, a custom yarn plugin is
used to discard devDependencies for prod build:
[prod-install](https://gitlab.com/larry1123/yarn-contrib/-/tree/master/packages/plugin-production-install)
