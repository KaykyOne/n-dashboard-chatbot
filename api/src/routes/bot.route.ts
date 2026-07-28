//* Controller Imports
import { disconnect, start, getQrCode } from "../controllers/bot.controller";

//* Library Imports
import { Router } from "express";

const router = Router();

router.route("/disconnect/:id").get(disconnect);
router.route("/start/:id").get(start);
router.route("/qrcode/:id").get(getQrCode);

export { router as botRouter };