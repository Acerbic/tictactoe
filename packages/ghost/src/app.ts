import express from "express";
import cors from "cors";

export const app = express();

app.use(
    cors({
        origin: "*"
    })
);

// Docker healthcheck
app.get("/healthcheck", function (_, res) {
    res.send({});
});
