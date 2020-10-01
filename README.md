# TicTacToe the game

The idea is to create a framework for a game, while simultaneously practicing
my hand on a number of exciting technologies.

## Tech stack

-   [Node.js][node] (platform)
-   [Yarn] (package management for node)
-   [Express] (web server)
-   [Next.js][next] (React-based web application framework)
-   [Xstate] (state logic library)
-   [Hasura] (GraphQL-enhanced database storage)
-   [Socket.io][socketio] (websocket communications library)
-   [TypeScript][ts] (type safe language to use in place of Javascript)
-   [Lerna] (monorepo management tool which augments Yarn's built-in
    features)
-   [Docker] (lightweight containerization for running your code)

## Install prerequisites

-   Docker
-   Docker Compose

```bash
npm i -g yarn lerna
```

## Organization of the project files

The project is split into a number of (semi-)independent packages (packages/\*).
Lerna is used to tie the packages together and make them cross-link to each
other with usage of Yarn Workspaces feature.

This allows packages to stay uncoupled and don't reference each other by
"file://" dependencies - in theory, packages could be used "as is" even without
lerna, if they are published to the npm repo.

Directories and files structure:

-   `deployment/*` holds scripts and configurations related to
    compiling/building and deploying project's packages
-   `docs/*` (outdated) documentation on project APIs and architecture
-   `packages/*/*` the source files
-   `lerna.json` configuration for Lerna.

## Running dev in Docker

Creates DB, Ghost, Gmaster, Client containers.

```bash
yarn deploy:dev
```

After, you can connect on http://docker-host-machine:3030 to the game client.
You can shut down Docker containers with

```bash
yarn down:dev
```

## Running dev in localhost

This runs everything on localhost (on different ports), except for Hasura DB
(which requires Docker if running locally).

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

or, alternative to starting 3 processes individually, start all of them in
parallel with

```bash
yarn dev
```

After all processes start, you can connect on http://localhost:3030 to the game
client, and on http://localhost:8080 to the Hasura's Console.

You can shut down Hasura containers with

```bash
yarn down:dev:local
```

[node]: https://nodejs.org/
[lerna]: https://lerna.js.org/
[yarn]: https://yarnpkg.com/
[express]: https://expressjs.com/
[next]: https://nextjs.org/
[xstate]: https://xstate.js.org/
[hasura]: https://hasura.io/
[socketio]: https://socket.io/
[ts]: https://www.typescriptlang.org/
[docker]: https://www.docker.com/
