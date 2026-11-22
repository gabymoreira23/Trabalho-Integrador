const express = require("express");
const asyncHandler = require("../middlewares/asyncHandler");
const controller = require("./contratos.controller");

const router = express.Router();

router.get("/", asyncHandler(controller.listar));
router.get("/:id", asyncHandler(controller.buscar));
router.post("/", asyncHandler(controller.criar));
router.put("/:id", asyncHandler(controller.atualizar));
router.delete("/:id", asyncHandler(controller.excluir));

module.exports = router;
