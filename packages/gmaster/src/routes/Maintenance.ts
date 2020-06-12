import * as express from "express";
import { State } from "xstate";
import { DbConnector } from "../db/db";
import {
    GameId,
    CheckGameResponse,
    APIResponseFailure
} from "@trulyacerbic/ttt-apis/gmaster-api";
import { GameState } from "../game/game-schema";
import { GameStateValueToApi } from "../game/game-machine";
import { makeFailureResponse } from "./utils";

const router = express.Router();

/**
 * Check the state of a db, gmaster, etc.
 * This is not exactly part of API, but more of a admin access hatch
 */
router.get("/Maintenance", async function (req, res, next) {
    const gamesDb = req.app.get("gamesDb") as DbConnector;

    gamesDb.Stats().then(data =>
        res.send({
            data
        })
    );
});

router.post("/Maintenance", async function (req, res, next) {
    const gamesDb = req.app.get("gamesDb") as DbConnector;

    gamesDb.Stats().then(data =>
        res.send({
            data
        })
    );
});

export default router;
