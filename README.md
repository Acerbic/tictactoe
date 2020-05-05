# TicTacToe the game

The idea is to create a framework for a game, while simultaneously practicing
my hand on a number of exciting technologies.

## Tech stack

-   NodeJS
-   yarn
-   Node Express
-   NextJS (React)
-   Xstate
-   Prisma GraphQL
-   Socket.io
-   TypeScript
-   Lerna
-   Docker

## Install prerequisites

Docker, Docker Compose,

```bash
npm i -g yarn lerna
```

## Organization of packages

The project is split into a number of (semi-)independent packages (packages/\*).
Lerna is used to tie the packages together and make them cross-link to each
other.

The main obstacle is "packages/gamesdb" package. It contains Prisma definitions
and is able to generate a `client-library`. That client library is needed by
other packages.

The current chosen solution is:

1. `client-library` is not committed to the repo and not published
2. Instead, the "gamesdb" package has a post-install npm script hook that will
   generate the library after the package is installed, and other packages list
   it as dependency in their package.json ("@trulyacerbic/ttt-gamesdb").
3. Publishing to the external repo is avoided and instead Lerna is used to link
   "gamesdb" to other packages during `bootstrap`.

This allows packages to stay uncoupled and don't reference each other by
"file://" dependencies - in the future, packages could be used "as is" even
without lerna, if they are published to the npm repo.

## Running dev in Docker

Creates Prisma DB, Ghost, Gmaster, Client containers.

```bash
yarn deploy:dev
```

After, you can connect on http://docker-host-machine:3030 to the game client.
You can shut down Docker containers with

```bash
yarn down:dev
```

## Running dev in localhost

This runs everything on localhost (on different ports), except for Prisma DB
(which requires Docker).

Start up DB and initialize it (takes about a minute):

```bash
yarn deploy:dev:local
```

After, each of the following should be a separate process, running in parallel:

```bash
yarn start:gmaster
```

```bash
yarn start:ghost
```

```bash
yarn start:client
```

After all processes start, you can connect on http://localhost:3030 to the game client, and on http://localhost:4466 to the Prisma's playground.

You can shut down Prisma Docker container with

```bash
yarn down:dev:local
```
