FROM hasura/graphql-engine:v1.3.2.cli-migrations-v2

# migrations and meta - definitions of DB and GraphQL bindings
COPY hasura/migrations /hasura-migrations
COPY hasura/metadata /hasura-metadata