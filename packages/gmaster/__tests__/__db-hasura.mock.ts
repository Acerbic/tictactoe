/**
 * Mock class implementing DbConnector with a simple
 * in-memory storage
 */

import { GameId } from "@trulyacerbic/ttt-apis/gmaster-api";
import { DbConnector, Game } from "../src/db/db";

export class DbConnectorMock implements DbConnector {
    __gameID = 1000;
    __games = new Map<GameId, Game>();

    CreateGame = jest.fn<Promise<GameId>, [Game]>(async g => {
        this.__gameID++;
        this.__games.set(String(this.__gameID), g);
        return String(this.__gameID);
    });
    DropGame = jest.fn<Promise<any>, [GameId]>(async id => {
        this.__games.delete(id);
        return;
    });
    HasGame = jest.fn<Promise<boolean>, [GameId]>(async id =>
        this.__games.has(id)
    );
    LoadGame = jest.fn<Promise<Game>, [GameId]>(async id => {
        if (this.__games.has(id)) {
            return this.__games.get(id)!;
        } else {
            throw "No such game session";
        }
    });
    SaveGame = jest.fn<
        Promise<any>,
        [GameId, Partial<Pick<Game, "state" | "meta">>]
    >(async (id, update) => {
        if (
            typeof update.meta === "undefined" &&
            (typeof update.state === "undefined" || update.state === null)
        ) {
            throw "Some error happened while updating a game";
        }
        if (this.__games.has(id)) {
            const old_game = this.__games.get(id);
            this.__games.set(id, Object.assign({}, old_game, update));
        } else {
            throw "Some error happened while updating a game";
        }
    });
}
