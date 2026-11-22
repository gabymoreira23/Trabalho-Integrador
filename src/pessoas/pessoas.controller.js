const service = require("./pessoas.service");

module.exports = {
    listar: async (req, res) => res.json(await service.listar(req.query)),
    buscar: async (req, res) => res.json(await service.buscar(req.params.id)),
    criar: async (req, res) => res.status(201).json(await service.criar(req.body || {})),
    atualizar: async (req, res) => res.json(await service.atualizar(req.params.id, req.body || {}, req.user)),
    excluir: async (req, res) => {
        await service.excluir(req.params.id, req.user);
        res.status(204).send();
    },
};
	