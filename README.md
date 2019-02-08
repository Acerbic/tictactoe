# TicTacToe the game #

The idea is to create a framework for a game, while simultaneously practicing
my hand on a number of exciting technologies.

## Tech stack ##

- NodeJS
- yarn
- Node Express
- Xstate
- Prisma GraphQL
- Socket.io
- TypeScript
- Lerna
- Docker

```
docker-compose build
docker-compose up -d
```

## Install prerequisites ##

```bash
npm i -g yarn lerna
```

## Scaffold for dev ##

Windows: (a bit complicated to avoid a [bug](https://github.com/yarnpkg/yarn/issues/6175))

```bash
lerna bootstrap --ignore-scripts
lerna run generate --scope=@trulyacerbic/ttt-gamesdb
```

Linux (Mac?):

```bash
lerna bootstrap
```