/**
 * Node Express application
 */

import express, { ErrorRequestHandler, Response } from "express";
import morgan from "morgan";

// import { HasuraConnector } from "./db/db-hasura";
import { HasuraApolloConnector } from "./db/db-hasura-apollo";

import CreateGame from "./routes/CreateGame";
import CheckGame from "./routes/CheckGame";
import DropGame from "./routes/DropGame";
import MakeMove from "./routes/MakeMove";
import healthcheck from "./routes/healthcheck";
import { APIResponseFailure } from "@trulyacerbic/ttt-apis/gmaster-api";
import { makeFailureResponse } from "./routes/utils";

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
        new HasuraApolloConnector(process.env.HASURA_URL!)
        // new HasuraConnector({ endpoint: process.env.HASURA_URL! })
    );

    // Rest API
    app.use(CheckGame);
    app.use(CreateGame);
    app.use(DropGame);
    app.use(MakeMove);

    // Util
    app.use(healthcheck);

    // Catch-all error handler
    app.use(<ErrorRequestHandler>((
        err,
        req,
        res: Response<APIResponseFailure>,
        next
    ) => {
        res.send(makeFailureResponse(err));
    }));

    return app;
};
export default generateApp;
