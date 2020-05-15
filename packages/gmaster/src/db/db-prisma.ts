/**
 * This is an implementation of GMaster <-> DBStorage connection (./db.ts) using Prisma v1.0
 */

import { Game, DbConnector } from "./db";
import { GameId } from "../routes/api";
import { prisma, Prisma } from "@trulyacerbic/ttt-gamesdb";
import { BaseClientOptions } from "prisma-client-lib";

class PrismaConnector implements DbConnector {
    prisma: Prisma = prisma;

    constructor(options?: BaseClientOptions) {
        if (options) {
            this.prisma = new Prisma(options);
        }
    }

    async LoadGame(id: GameId): Promise<Game> {
        return this.prisma.gameSession({ id }).then(gs => {
            if (gs) {
                return gs;
            } else {
                throw "No such game session";
            }
        });
    }

    async SaveGame(id: GameId, game: Game): Promise<any> {
        return this.prisma.updateGameSession({
            data: game,
            where: { id }
        });
    }

    async CreateGame(game: Game): Promise<GameId> {
        const newGame = await this.prisma.createGameSession({
            player1: game.player1,
            player2: game.player2,
            state: game.state,
            board: game.board
        });
        return newGame.id;
    }

    async DropGame(id: GameId): Promise<any> {
        return this.prisma.deleteGameSession({ id });
    }

    async HasGame(id: GameId): Promise<boolean> {
        let games_count = await this.prisma
            .gameSessionsConnection({ where: { id } })
            .aggregate()
            .count();
        return 1 === games_count;
    }
}

export default PrismaConnector;
