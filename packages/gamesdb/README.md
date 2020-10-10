# GamesDB

This is a database definition module based on [Hasura].
Hasura provides GraphQL syntax access to a PostgreSQL database with support of subscriptions.

## Two-faceted usage

This package has 2 distinct sides.

-   In prod, this package is used to configure a generic Hasura server into our
    app's specific entities storage backend by taking a default empty Hasura
    server and applying preserved metadata and migrations to it. I.e. this
    package is used to build a "tuned" Hasura container.
-   During dev, it operates as a command center to apply/revert migrations,
    generate graphql schema definition from current db shape and more - see
    Hasura CLI documentation.

## As a Docker container source

See `deployment/prod` and `deployment/dev` directories of the monorepo. When
used to build a specialized Hasura container, only `./hasura` directory of this
package is really used. No Node.js modules are installed.

## As a cli command center

If this package's Node.js dependencies are installed, you have access to [Hasura
CLI][hcli] to manage your running Hasura server and perform other graphql
operations.

-   `yarn hasura [<commands>]` just passes whatever in brackets to Hasura CLI
-   `yarn console` opens a Console (web UI) for Hasura server in browser
-   `yarn deploy` applies currently saved migrations and meta (from files in
    `./hasura`) to a running server instance. It is useful if you need to
    initialize a new server, for example.
-   `yarn generate` will scan current running server and produce
    `hasura.graphql` file with GraphQL schema definitions from the server's
    entities - columns, tables, etc.

[hasura]: https://hasura.io/
[hcli]: https://hasura.io/docs/1.0/graphql/core/hasura-cli/index.html#hasuracli-manual
