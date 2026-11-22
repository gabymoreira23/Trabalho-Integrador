const express = require("express");
const asyncHandler = require("../middlewares/asyncHandler");
const controller = require("./chamados.controller");
const { autorizar } = require("../auth/auth.middleware");

const router = express.Router();

// Cliente e equipe (o service filtra o que cada um enxerga).
router.get("/", asyncHandler(controller.listar));
router.get("/imoveis", asyncHandler(controller.imoveis)); // antes de /:id, senão "imoveis" viraria um id
router.get("/:id", asyncHandler(controller.buscar));
router.post("/", asyncHandler(controller.criar));

// Só a equipe trata e remove chamados.
router.put("/:id", autorizar("funcionario"), asyncHandler(controller.atualizar));
router.delete("/:id", autorizar("funcionario"), asyncHandler(controller.excluir));

module.exports = router;
