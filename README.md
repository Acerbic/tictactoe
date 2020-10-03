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



## Running in dev environment

For dev purposes you can either run components of the project in separate
processes on the same machine, or as docker containers. Both options provide
automated rebuild and restart of servers on source files change and ability to
debug code with node debugger.

Docker is easier to run and is closer to production configuration, but if you
want to observe packages' debug output, you must use `docker logs`.

Gmaster process/container is using port 9228 for node debugger. Ghost is using
9229.

### Running dev in Docker

Creates DB, Ghost, Gmaster, Client containers.

```bash
yarn deploy:dev
```

Source files are mounted into the containers, so you can edit sources normally
and the process inside the container will recompile and restart.

After, you can connect on http://localhost:3030 to the game client.

You can shut down Docker containers with

```bash
yarn down:dev
```

### Running dev in local processes

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

### Debugging with VSCode.

Either you run packages in Docker or local processes, GMaster and GHost publish
debugging access on ports 9228 and 9229 of localhost, respectively. Copy values
from `deployment/dev/vscode.launch.json` into your vscode launch configuration
to use vscode debugging utilities.

The configuration provided allow either to attach to already running processes
(in Docker or local processes), or launch new (local) process with vscode
supervision.

- Attaching is faster and you can use the same instance of vscode to attach/detach
to different processes. The downside is that upon rebuild after source files
change vscode will not automatically re-attach.

- "Launch" configurations will reattach nicely after process restarts, but if you
launch gmaster and ghost separately, you'd need two instances of vscode to debug
them simultaneously.

- Finally, the "ALL - Launch" configuration will run all 3 packages in parallel
  and under vscode observation (like if you run `yarn dev`). With that, you can
  use the same vscode instance to trace both ghost and gmaster code and you
  don't need to manually start any extraneous processes. The negatives are that
  the startup time is longer and its harder to understand console output.


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
