FROM hasura/graphql-engine:v1.2.1.cli-migrations-v2

# migrations and meta - definitions of DB and GraphQL bindings
COPY packages/gamesdb/hasura/migrations /hasura-migrations
COPY packages/gamesdb/hasura/metadata /hasura-metadata