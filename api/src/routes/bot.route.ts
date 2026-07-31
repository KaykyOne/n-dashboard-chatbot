//* Controller Imports
import { disconnect, getQrCode, pairingCode, start, startAll } from "../controllers/bot.controller";

//* Library Imports
import { Router } from "express";

const router = Router();

router.route("/disconnect/:id").get(disconnect);
router.route("/start-all").get(startAll);
router.route("/start/:id").get(start);
router.route("/qrcode/:id").get(getQrCode);
router.route("/pairing-code/:id").post(pairingCode);

export { router as botRouter };
