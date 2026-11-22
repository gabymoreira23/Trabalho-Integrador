const express = require("express");
const asyncHandler = require("../middlewares/asyncHandler");
const controller = require("./vistorias.controller");

const router = express.Router();

router.get("/", asyncHandler(controller.listar));
router.get("/:id", asyncHandler(controller.buscar));
router.post("/", asyncHandler(controller.criar));
router.put("/:id", asyncHandler(controller.atualizar));
router.delete("/:id", asyncHandler(controller.excluir));

// Etapas da vistoria
router.put("/:id/checklist", asyncHandler(controller.salvarChecklist));
router.put("/:id/parecer", asyncHandler(controller.registrarParecer));
router.put("/:id/orcamento", asyncHandler(controller.salvarOrcamento));
router.put("/:id/assinatura", asyncHandler(controller.salvarAssinatura));

module.exports = router;
