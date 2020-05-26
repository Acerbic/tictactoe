# WHAT!?

This is a database definition module based on Hasura.

Right now, this is a place to storage Hasura's migrations and meta data. Both
are used as mounted volumes during Hasura's graphql-engine startup. It is
possible to transform this package into a dependency package, like it was with
Prisma (see DEPRECATED section below), or use it as some sort of command center
to distribute db cluster updates with `hasura-cli`.

It is unclear if this workspace should at all be kept as a separate package -
perhaps better would be to just move Hasura maintainance to workspaces root.

## (DEPRECATED) The purpose of this package is twofold:

1. When built into a docker image and that image is started, it will connect
   to the database and update Prisma database shape to the current definition,
   or initiate the database if this is the first run.
2. When installed as a Node dependency, it will generate a JS client library
   to be used to connect to the Prisma database, aware of the database
   definitions. (Also provides .d.ts declarations for TS)
