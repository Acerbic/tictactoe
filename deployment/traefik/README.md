# Files

This directory is a "deployment pack" - set of files to pull / update and start
the application on target machine with Traefik.

-   Traefik is used to manage ports, https termination and domain name certificates.
-   Docker Compose is used for containers correct deployment, coordination and liveliness.
-   Application itself is located in externally prebuilt containers in a Docker Repository.

## Usage

On the first start:

-   create `.env` file from `.template.env` with appropriate config values
-   execute `run_update.sh`

When images in Docker repository are updated to newer versions, execute `run_update.sh` again.
