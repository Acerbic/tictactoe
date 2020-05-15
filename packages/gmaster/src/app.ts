/**
 * Node Express application
 */

import express, { ErrorRequestHandler, Response } from "express";
import morgan from "morgan";

import GamesDbConnector from "./db/db-prisma";

import CreateGame from "./routes/CreateGame";
import CheckGame from "./routes/CheckGame";
import DropGame from "./routes/DropGame";
import MakeMove from "./routes/MakeMove";
import { APIResponseFailure } from "./routes/api";

const generateApp = () => {
    const app = express();

    if (process.env.NODE_ENV !== "test") {
        app.use(morgan("dev"));
    }
    app.use(express.json());

    // this will throw if PRISMA_URL is undefined or incorrect
    new URL(process.env.PRISMA_URL!);
    // DB connection to be reused by all API calls
    app.set("gamesDb", new GamesDbConnector({endpoint: process.env.PRISMA_URL!}));

    // Rest API
    app.use(CheckGame);
    app.use(CreateGame);
    app.use(DropGame);
    app.use(MakeMove);

    // Catch-all error handler
    app.use(<ErrorRequestHandler>((err, req, res : Response<APIResponseFailure>, next) => {
        const errorCode = err?.code || 0;
        const errorMessage = err?.message || err?.toString?.() || "Unknown error";
        res.send({success: false, errorCode, errorMessage})
    }));

    return app;
};
export default generateApp;