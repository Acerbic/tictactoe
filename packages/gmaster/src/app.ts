/**
 * Node Express application
 */

import express from "express";
import morgan from "morgan";

import gamesDb from "./db/db-prisma";

import CreateGame from "./routes/CreateGame";
import CheckGame from "./routes/CheckGame";
import DropGame from "./routes/DropGame";
import MakeMove from "./routes/MakeMove";

const app = express();

if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
}
app.use(express.json());

// DB connection to be reused by all API calls
app.set("gamesDb", gamesDb);

// Rest API
app.use(CheckGame);
app.use(CreateGame);
app.use(DropGame);
app.use(MakeMove);

export default app;
