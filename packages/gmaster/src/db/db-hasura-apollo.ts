import {
    ApolloClient,
    gql,
    HttpLink,
    InMemoryCache
} from "@apollo/client/core";
import fetch from "cross-fetch";

import { Game, DbConnector } from "./db";
import { GameId } from "@trulyacerbic/ttt-apis/gmaster-api";
import { GameNotFoundError } from "../routes/utils";

export class HasuraApolloConnector implements DbConnector {
    private client: ApolloClient<any>;

    constructor(endpoint: string) {
        this.client = new ApolloClient({
            cache: new InMemoryCache(),
            link: new HttpLink({
                uri: endpoint,
                fetch,
                headers: {
                    "x-hasura-admin-secret":
                        process.env.HASURA_GRAPHQL_ADMIN_SECRET
                }
            })
        });
    }
    LoadGame(id: GameId): Promise<Game> {
        const query = gql`
            query LoadGame($id: uuid!) {
                gamesession_by_pk(id: $id) {
                    id
                    player1
                    player2
                    state
                    meta
                }
            }
        `;

        return this.client
            .query({
                query,
                variables: { id },
                fetchPolicy: "network-only"
            })
            .then(r => {
                const game = r?.data?.gamesession_by_pk;
                if (game?.id) {
                    return game;
                } else {
                    throw new GameNotFoundError("No such game session");
                }
            });
    }

    SaveGame(
        id: GameId,
        changes: Partial<Pick<Game, "state" | "meta">>
    ): Promise<any> {
        const variables: any = { id };

        const set_fields: string[] = [];
        if (changes.state) {
            variables.state = changes.state;
            set_fields.push("state: $state");
        }
        if (typeof changes.meta !== "undefined") {
            variables.meta = changes.meta;
            set_fields.push("meta: $meta");
        }

        if (set_fields.length === 0) {
            throw new Error(
                "Attempted to update a game record with changed fields"
            );
        }

        const mutation = gql`
            mutation SaveGame($id: uuid!, $state: String, $meta: String) {
                update_gamesession_by_pk(
                    pk_columns: {id: $id},
                    _set: {${set_fields.join(", ")}}
                ) {
                    id
                }
            }
        `;

        return this.client
            .mutate({
                mutation,
                variables
            })
            .then(r => {
                if (r?.data?.update_gamesession_by_pk) {
                    return r.data.update_gamesession_by_pk.id;
                } else {
                    throw new GameNotFoundError("No such game session");
                }
            });
    }

    CreateGame(game: Game): Promise<string> {
        const mutation = gql`
            mutation($game: gamesession_insert_input!) {
                insert_gamesession_one(object: $game) {
                    id
                }
            }
        `;

        return this.client
            .mutate({
                mutation,
                variables: { game }
            })
            .then(r => {
                const id = r?.data?.insert_gamesession_one?.id;
                if (id) {
                    return id;
                } else {
                    throw Error("Failed to create a game");
                }
            });
    }
    DropGame(id: GameId): Promise<any> {
        const mutation = gql`
            mutation($id: uuid!) {
                delete_gamesession_by_pk(id: $id) {
                    id
                }
            }
        `;
        return this.client
            .mutate({
                mutation,
                variables: { id }
            })
            .then(r => {
                return r.data.delete_gamesession_by_pk.id;
            });
    }
    HasGame(id: GameId): Promise<boolean> {
        const query = gql`
            query($id: uuid!) {
                gamesession_by_pk(id: $id) {
                    id
                }
            }
        `;

        return this.client
            .query({
                query,
                variables: { id }
            })
            .then(r => (r.data?.gamesession_by_pk?.id && true) || false);
    }
    Stats(): Promise<any> {
        const query = gql`
            query {
                gamesession_aggregate {
                    aggregate {
                        count
                    }
                }
            }
        `;

        return this.client
            .query({
                query
            })
            .then(r => r.data);
    }
    Upkeep(): Promise<any> {
        const query = gql`
            mutation($ts: timestamptz) {
                delete_gamesession(where: { updated_at: { _lt: $ts } }) {
                    affected_rows
                }
            }
        `;

        const now = Number(new Date());
        const yesterday = now - 24 * 60 * 60 * 1000;
        return this.client
            .query({
                query,
                variables: {
                    ts: new Date(yesterday).toUTCString()
                }
            })
            .then(r => r.data);
    }
}
