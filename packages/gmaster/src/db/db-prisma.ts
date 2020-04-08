/**
 * This is an implementation of GMaster <-> DBStorage connection (./db.ts) using Prisma v1.0
 */

import { Game, DbConnector } from "./db";
import { GameId } from "../routes/api";
import { prisma } from "@trulyacerbic/ttt-gamesdb";

const PrismaConnector: DbConnector = {
    async LoadGame(id: GameId): Promise<Game> {
        return prisma.gameSession({ id }).then(gs => {
            if (gs) {
                return gs;
            } else {
                throw "No such game session";
            }
        });
    },
    async SaveGame(id: GameId, game: Game): Promise<any> {
        return prisma.updateGameSession({
            data: game,
            where: { id }
        });
    },
    async CreateGame(game: Game): Promise<GameId> {
        const newGame = await prisma.createGameSession({
            player1: game.player1,
            player2: game.player2,
            state: game.state,
            board: game.board
        });
        return newGame.id;
    },
    async DropGame(id: GameId): Promise<any> {
        return prisma.deleteGameSession({ id });
    },
    async HasGame(id: GameId): Promise<boolean> {
        let games_count = await prisma
            .gameSessionsConnection({ where: { id } })
            .aggregate()
            .count();
        return 1 === games_count;
    }
};

export = PrismaConnector;
