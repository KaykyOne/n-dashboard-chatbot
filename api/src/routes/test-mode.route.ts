import { Router } from "express";
import {
    changeTestMode,
    createTestNumber,
    deleteTestNumber,
    getTestNumbers,
    testModeStatus
} from "../controllers/test-mode.controller.js";

const router = Router();

router.route("/test-mode/:id")
    .get(testModeStatus)
    .patch(changeTestMode);
router.route("/test-numbers/:id")
    .get(getTestNumbers)
    .post(createTestNumber);
router.route("/test-numbers/:id/:numberId").delete(deleteTestNumber);

export { router as testModeRouter };
