const service = require("./vistorias.service");

module.exports = {
    listar: async (req, res) => res.json(await service.listar(req.query)),
    buscar: async (req, res) => res.json(await service.buscarCompleta(req.params.id)),
    criar: async (req, res) => res.status(201).json(await service.criar(req.body || {})),
    atualizar: async (req, res) => res.json(await service.atualizar(req.params.id, req.body || {})),
    excluir: async (req, res) => {
        await service.excluir(req.params.id);
        res.status(204).send();
    },
    salvarChecklist: async (req, res) => res.json(await service.salvarChecklist(req.params.id, req.body || {})),
    registrarParecer: async (req, res) => res.json(await service.registrarParecer(req.params.id, req.body || {})),
    salvarOrcamento: async (req, res) => res.json(await service.salvarOrcamento(req.params.id, req.body || {})),
    salvarAssinatura: async (req, res) => res.json(await service.salvarAssinatura(req.params.id, req.body || {})),
};
