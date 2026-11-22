const express = require("express");
const asyncHandler = require("../middlewares/asyncHandler");
const controller = require("./auth.controller");
const { autenticar } = require("./auth.middleware");
const { protegerLogin } = require("../middlewares/seguranca");

const router = express.Router();

router.post("/login", protegerLogin(), asyncHandler(controller.login)); // 5 senhas erradas = bloqueio de 15 min
router.post("/refresh", asyncHandler(controller.refresh));
router.post("/logout", asyncHandler(controller.logout));
router.get("/me", autenticar, controller.me);

module.exports = router;
