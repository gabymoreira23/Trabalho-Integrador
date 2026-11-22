const service = require("./chamados.service");

module.exports = {
    listar: async (req, res) => res.json(await service.listar(req.query, req.user)),
    imoveis: async (req, res) => res.json(await service.imoveisParaChamado(req.user)),
    buscar: async (req, res) => res.json(await service.buscar(req.params.id, req.user)),
    criar: async (req, res) => res.status(201).json(await service.criar(req.body || {}, req.user)),
    atualizar: async (req, res) => res.json(await service.atualizar(req.params.id, req.body || {}, req.user)),
    excluir: async (req, res) => {
        await service.excluir(req.params.id, req.user);
        res.status(204).send();
    },
};
