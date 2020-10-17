import * as express from "express";

const router = express.Router();

/**
 * Docker healthcheck responder
 */
router.get("/healthcheck", async function (_, res) {
    res.send({});
});

export default router;
