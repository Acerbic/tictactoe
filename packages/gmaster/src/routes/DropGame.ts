import * as express from "express";
import { DbConnector } from "../db/db";
import { GameId, DropGameResponse, APIResponseFailure } from "./api";
import { makeFailureResponse } from "./utils";

const router = express.Router();

router.post("/DropGame/:gameId", function(req, res, next) {
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
                        // TODO: replace with a proper error code
                        const response = makeFailureResponse(
                            undefined,
                            "Failed to create a new game",
                            0
                        );
                        res.send(response);
                    });
            } else {
                // TODO: replace with a proper error code
                const response = makeFailureResponse(
                    undefined,
                    "Can't drop - game not found",
                    0
                );
                res.send(response);
            }
        })
        .catch(err => {
            // TODO: replace with a proper error code
            const response = makeFailureResponse(
                err,
                "Failed when trying to find existing game",
                0
            );
            res.send(response);
        });
});

export default router;
