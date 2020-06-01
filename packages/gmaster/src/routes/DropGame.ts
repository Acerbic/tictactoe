import * as express from "express";
import { DbConnector } from "../db/db";
import {
    GameId,
    DropGameResponse,
    APIResponseFailure,
    ErrorCodes
} from "@trulyacerbic/ttt-apis/gmaster-api";
import { makeFailureResponse } from "./utils";

const router = express.Router();

router.post("/DropGame/:gameId", function (req, res, next) {
    const gameId = req.params.gameId as GameId;
    const gamesDb = req.app.get("gamesDb") as DbConnector;

    gamesDb
        .HasGame(gameId)
        .then(hasgame => {
            if (hasgame) {
                gamesDb
                    .DropGame(gameId)
                    .then(() => {
                        const response: DropGameResponse = {
                            success: true
                        };
                        res.send(response);
                    })
                    .catch(err => {
                        const response = makeFailureResponse(
                            err,
                            "Failed to create a new game"
                        );
                        res.send(response);
                    });
            } else {
                const response = makeFailureResponse(
                    undefined,
                    "Can't drop - game not found",
                    ErrorCodes.GAME_NOT_FOUND
                );
                res.send(response);
            }
        })
        .catch(err => {
            const response = makeFailureResponse(
                err,
                "Failed when trying to find existing game"
            );
            res.send(response);
        });
});

export default router;
