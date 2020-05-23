/**
 * Node Express application
 */

import express, { ErrorRequestHandler, Response } from "express";
import morgan from "morgan";

import { HasuraConnector } from "./db/db-hasura";

import CreateGame from "./routes/CreateGame";
import CheckGame from "./routes/CheckGame";
import DropGame from "./routes/DropGame";
import MakeMove from "./routes/MakeMove";
import { APIResponseFailure } from "@trulyacerbic/ttt-apis/gmaster-api";

const generateApp = () => {
    const app = express();

    if (process.env.NODE_ENV !== "test") {
        app.use(morgan("dev"));
    }
    app.use(express.json());

    // this will throw if HASURA_URL is undefined or incorrect
    new URL(process.env.HASURA_URL!);
    // DB connection to be reused by all API calls
    app.set(
        "gamesDb",
        new HasuraConnector({ endpoint: process.env.HASURA_URL! })
    );

    // Rest API
    app.use(CheckGame);
    app.use(CreateGame);
    app.use(DropGame);
    app.use(MakeMove);

    // Catch-all error handler
    app.use(<ErrorRequestHandler>((
        err,
        req,
        res: Response<APIResponseFailure>,
        next
    ) => {
        const errorCode = err?.code || 0;
        const errorMessage =
            err?.message || err?.toString?.() || "Unknown error";
        res.send({ success: false, errorCode, errorMessage });
    }));

    return app;
};
export default generateApp;
