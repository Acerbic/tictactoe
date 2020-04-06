import * as express from "express";
import { GameId, Game, DbConnector } from "../db/db.js";
import { DropGameRequest, DropGameResponse } from "gmasterREST";

const router = express.Router();

router.post("/DropGame/:gameId", function(req, res, next) {
    const gameId = req.params.gameId as GameId;
    const gamesDb = (req.app as any).gamesDb as DbConnector;

    gamesDb.HasGame(gameId).then(hasgame => {
        if (hasgame) {
            gamesDb.DropGame(gameId).then(() => {
                const response: DropGameResponse = {
                    success: true
                };
                res.send(response);
            });
            // TODO: catch
        } else {
            const response: DropGameResponse = {
                success: false,
                errorMessage: "Can't drop - game not found",
                errorCode: 0 // TODO: replace with a proper code
            };
            res.send(response);
        }
    });
});

module.exports = router;
