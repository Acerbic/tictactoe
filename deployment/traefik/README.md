# Files

This directory is a "deployment pack" - set of files to pull / update and start
the application on target machine with Traefik.

-   Traefik is used to manage ports, https termination and domain name certificates.
-   Docker Compose is used for containers' correct deployment, coordination and liveliness.
-   Application itself is located in externally prebuilt containers in a Docker Registry.

## Usage

On the first start:

-   create `.env` file from `.template.env` with appropriate config values
-   execute `run_update.sh`

### Manual update

When images in Docker Registry are updated to newer versions, execute `run_update.sh` again.

### CI/CD update

Travis CI deployment script will push newly built images into a Docker Registry,
log into target host machine over SSH and run `run_update.sh` with sudo.
Appropriate sudo permissions should be given to the user travisci is logging as.
