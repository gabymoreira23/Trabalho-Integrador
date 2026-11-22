
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS chamado_historico;
DROP TABLE IF EXISTS vistoria_assinaturas;
DROP TABLE IF EXISTS vistoria_reparos;
DROP TABLE IF EXISTS vistoria_itens;
DROP TABLE IF EXISTS vistorias;
DROP TABLE IF EXISTS chamados;
DROP TABLE IF EXISTS contratos;
DROP TABLE IF EXISTS imoveis;
DROP TABLE IF EXISTS pessoas;

CREATE TABLE pessoas (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL,
    cpf_cnpj    VARCHAR(14)  NOT NULL UNIQUE,                  -- somente digitos
    telefone    VARCHAR(30),
    email       VARCHAR(120),
    endereco    VARCHAR(200),
    tipo        VARCHAR(12)  NOT NULL CHECK (tipo IN ('funcionario', 'proprietario', 'inquilino')),
    usuario     VARCHAR(40)  NOT NULL UNIQUE,                  -- login
    senha_hash  VARCHAR(100) NOT NULL,                         -- hash bcrypt (nunca a senha pura)
    ativo       BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);



CREATE TABLE imoveis (
    id               SERIAL PRIMARY KEY,
    codigo           VARCHAR(30)   NOT NULL UNIQUE,
    endereco         VARCHAR(200)  NOT NULL,
    categoria        VARCHAR(50)   NOT NULL,
    finalidade       VARCHAR(10)   NOT NULL CHECK (finalidade IN ('aluguel', 'venda')),
    valor            NUMERIC(12,2) NOT NULL CHECK (valor >= 0),
    disponivel       BOOLEAN       NOT NULL DEFAULT TRUE,
    proprietario_id  INTEGER       NOT NULL REFERENCES pessoas(id) ON DELETE RESTRICT
);

CREATE INDEX idx_imoveis_proprietario ON imoveis (proprietario_id);


CREATE TABLE contratos (
    id               SERIAL PRIMARY KEY,
    numero           VARCHAR(30)   NOT NULL UNIQUE,
    tipo             VARCHAR(10)   NOT NULL CHECK (tipo IN ('locacao', 'venda')),
    situacao         VARCHAR(10)   NOT NULL DEFAULT 'ativo' CHECK (situacao IN ('ativo', 'encerrado')),
    imovel_id        INTEGER       NOT NULL REFERENCES imoveis(id) ON DELETE RESTRICT,
    proprietario_id  INTEGER       NOT NULL REFERENCES pessoas(id) ON DELETE RESTRICT,
    inquilino_id     INTEGER       NOT NULL REFERENCES pessoas(id) ON DELETE RESTRICT,  -- na venda, e o comprador
    data_inicio      DATE          NOT NULL,
    data_fim         DATE          NOT NULL CHECK (data_fim >= data_inicio),
    valor            NUMERIC(12,2) NOT NULL CHECK (valor >= 0)
);

CREATE INDEX idx_contratos_imovel ON contratos (imovel_id);


CREATE TABLE vistorias (
    id              SERIAL PRIMARY KEY,
    imovel_id       INTEGER     NOT NULL REFERENCES imoveis(id) ON DELETE RESTRICT,
    cliente_id      INTEGER     NOT NULL REFERENCES pessoas(id) ON DELETE RESTRICT,   -- inquilino ou proprietario
    responsavel_id  INTEGER     NOT NULL REFERENCES pessoas(id) ON DELETE RESTRICT,   -- funcionario
    tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'final')),
    data            DATE        NOT NULL,
    horario         VARCHAR(5)  NOT NULL CHECK (horario ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
    observacoes     VARCHAR(500),
    status          VARCHAR(10) NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'realizada')),
   
    conclusao       VARCHAR(15) CHECK (conclusao IN ('aprovada', 'com_pendencias')),
    pendencias      VARCHAR(1000),
    parecer_obs     VARCHAR(500),
    parecer_data    DATE
);

CREATE INDEX idx_vistorias_imovel ON vistorias (imovel_id);


CREATE TABLE vistoria_itens (
    id           SERIAL PRIMARY KEY,
    vistoria_id  INTEGER      NOT NULL REFERENCES vistorias(id) ON DELETE CASCADE,
    comodo_item  VARCHAR(100) NOT NULL,
    estado       VARCHAR(10)  NOT NULL CHECK (estado IN ('bom', 'regular', 'ruim')),
    observacoes  VARCHAR(300)
);


CREATE TABLE vistoria_reparos (
    id           SERIAL PRIMARY KEY,
    vistoria_id  INTEGER       NOT NULL REFERENCES vistorias(id) ON DELETE CASCADE,
    item         VARCHAR(100)  NOT NULL,
    descricao    VARCHAR(300),
    valor        NUMERIC(12,2) NOT NULL CHECK (valor >= 0)
);


CREATE TABLE vistoria_assinaturas (
    id           SERIAL PRIMARY KEY,
    vistoria_id  INTEGER      NOT NULL REFERENCES vistorias(id) ON DELETE CASCADE,
    papel        VARCHAR(12)  NOT NULL CHECK (papel IN ('responsavel', 'cliente')),
    nome         VARCHAR(120) NOT NULL,
    imagem       TEXT         NOT NULL,
    assinado_em  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (vistoria_id, papel)
);



CREATE TABLE chamados (
    id              SERIAL PRIMARY KEY,
    imovel_id       INTEGER      NOT NULL REFERENCES imoveis(id) ON DELETE RESTRICT,
    solicitante_id  INTEGER      NOT NULL REFERENCES pessoas(id) ON DELETE RESTRICT,
    categoria       VARCHAR(10)  NOT NULL CHECK (categoria IN ('hidraulica', 'eletrica', 'estrutura', 'outros')),
    urgencia        VARCHAR(5)   NOT NULL CHECK (urgencia IN ('baixa', 'media', 'alta')),
    canal           VARCHAR(10)  NOT NULL DEFAULT 'sistema' CHECK (canal IN ('sistema', 'telefone', 'whatsapp', 'presencial')),
    descricao       VARCHAR(1000) NOT NULL,
    status          VARCHAR(12)  NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_analise', 'em_execucao', 'concluido')),
    prioridade      VARCHAR(5)   CHECK (prioridade IN ('baixa', 'media', 'alta')),     -- definida pela equipe (RF12)
    responsavel_id  INTEGER      REFERENCES pessoas(id) ON DELETE SET NULL,
    prazo           DATE,
    data_conclusao  DATE,
    solucao         VARCHAR(500),
    criado_em       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chamados_solicitante ON chamados (solicitante_id);
CREATE INDEX idx_chamados_status      ON chamados (status);

-- RF13 / RF14: historico de andamento
CREATE TABLE chamado_historico (
    id          SERIAL PRIMARY KEY,
    chamado_id  INTEGER       NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
    descricao   VARCHAR(500)  NOT NULL,
    criado_em   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


CREATE TABLE refresh_tokens (
    id          SERIAL PRIMARY KEY,
    token       VARCHAR(512) NOT NULL UNIQUE,
    id_usuario  INTEGER      NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
    expira_em   TIMESTAMPTZ  NOT NULL,
    revogado    BOOLEAN      NOT NULL DEFAULT FALSE,
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_usuario ON refresh_tokens (id_usuario);



INSERT INTO pessoas (nome, cpf_cnpj, telefone, email, endereco, tipo, usuario, senha_hash) VALUES
    ('Administrador', '12345678909', '4933214600', 'admin@fenix.test', 'Rua Florianópolis, 297 D', 'funcionario', 'admin', '$2b$12$AHKIj9OU9oPGxhyuC1jHp.1NejAHhltT7V8vkrT2WsoTtjhx0tmRq'),
    ('Carlos Pereira', '98765432100', '49999990001', 'carlos@fenix.test', NULL, 'funcionario', 'carlos', '$2b$12$cL85BezuB3.rJw/e149RlexJS9m3cEjfbQHAafWx24tGvTMCXJW.C'),
    ('Ana Lima', '11122233396', '49999990002', 'ana@fenix.test', NULL, 'funcionario', 'ana', '$2b$12$jqz6LRfITXBdRlA25Z6/z.Ne7eM0anVcE3stV62ii8zOp80AkQaYS'),
    ('João Almeida', '55566677720', '49988881111', 'joao@exemplo.com', 'Rua das Palmeiras, 10 - Chapecó', 'proprietario', 'joao', '$2b$12$3fJ0Hhvgs43XiaijRBK8rO34/ik4cIeg9Oe1fpZX6fWOKYG6Klnue'),
    ('Cíntia Janka', '22233344405', '49988882222', 'cintia@exemplo.com', 'Av. Getúlio Vargas, 900 - Chapecó', 'proprietario', 'cintia', '$2b$12$Fch51Byhx6K5R93fRptEQOzzFbMGIYujg6z92i.q6SQA.k275nmFi'),
    ('Maria Souza', '33344455508', '49977773333', 'maria@exemplo.com', 'Rua das Flores, 120 - Centro', 'inquilino', 'maria', '$2b$12$uOjZ0f5ubeAK7oZHum00ROVIrujsGbOG4C5z2w5jGP11fM2ZPwRD.'),
    ('Pedro Rocha', '44455566619', '49977774444', 'pedro@exemplo.com', 'Rua Quintino Bocaiúva, 260 E', 'inquilino', 'pedro', '$2b$12$t7yiJePabhoOJE4N25LiyOtvCmYPRsBBmGCOVjZPSY7db79PfHlX2');

INSERT INTO imoveis (codigo, endereco, categoria, finalidade, valor, disponivel, proprietario_id) VALUES
    ('IMV-0101', 'Rua das Flores, 120 - Centro',               'Apartamento',    'aluguel', 1800.00,   FALSE, 4),
    ('IMV-0102', 'Av. Brasil, 845 - Efapi',                    'Casa',           'venda',   520000.00, TRUE,  5),
    ('IMV-0087', 'Rua Quintino Bocaiúva, 260 E - Centro',      'Apartamento',    'aluguel', 1307.00,   FALSE, 5),
    ('IMV-0054', 'Rua Tapuias, 670 - Esplanada',               'Sala comercial', 'aluguel', 2500.00,   TRUE,  4);

INSERT INTO contratos (numero, tipo, situacao, imovel_id, proprietario_id, inquilino_id, data_inicio, data_fim, valor) VALUES
    ('CT-2026-0001', 'locacao', 'ativo', 1, 4, 6, '2026-01-10', '2028-01-10', 1800.00),
    ('CT-2026-0002', 'locacao', 'ativo', 3, 5, 7, '2026-03-01', '2029-03-01', 1307.00);

INSERT INTO vistorias (imovel_id, cliente_id, responsavel_id, tipo, data, horario, observacoes, status, conclusao, pendencias, parecer_data) VALUES
    (1, 6, 2, 'saida',   '2026-11-10', '14:00', 'Vistoria de saída',               'realizada', 'com_pendencias', 'Torneira da cozinha vazando; vidro da janela trincado.', '2026-11-10'),
    (3, 7, 3, 'final',   '2026-11-12', '09:30', NULL,                              'realizada', 'com_pendencias', 'Reparos necessários antes da devolução.',                 '2026-11-12'),
    (1, 6, 2, 'entrada', '2026-11-25', '10:00', 'Verificar estado de conservação', 'agendada',  NULL, NULL, NULL),
    (3, 7, 3, 'saida',   '2026-12-02', '15:00', NULL,                              'agendada',  NULL, NULL, NULL);

INSERT INTO vistoria_itens (vistoria_id, comodo_item, estado, observacoes) VALUES
    (1, 'Sala - Paredes',          'bom',     'Pintura em dia'),
    (1, 'Sala - Piso',             'regular', 'Riscos leves'),
    (1, 'Cozinha - Instalações',   'ruim',    'Torneira com vazamento'),
    (1, 'Banheiro - Louças',       'bom',     'Sem avarias'),
    (1, 'Quarto - Janelas',        'regular', 'Vidro trincado'),
    (2, 'Cozinha - Torneira',      'ruim',    NULL),
    (2, 'Sala - Pintura',          'regular', NULL);

INSERT INTO vistoria_reparos (vistoria_id, item, descricao, valor) VALUES
    (2, 'Torneira da cozinha', 'Troca de torneira e vedação', 180.00),
    (2, 'Pintura da sala',     'Retoque das paredes',         650.00),
    (2, 'Janela do quarto',    'Troca do vidro trincado',     430.00);

INSERT INTO chamados (imovel_id, solicitante_id, categoria, urgencia, canal, descricao, status, prioridade, responsavel_id, prazo, data_conclusao, solucao, criado_em) VALUES
    (1, 6, 'hidraulica', 'alta',  'sistema',  'Vazamento na cozinha',                'em_execucao', 'alta',  2, '2026-11-21', NULL,         NULL,                       '2026-11-03 09:00:00-03'),
    (1, 6, 'eletrica',   'media', 'sistema',  'Tomada da sala não funciona',         'concluido',   'media', 2, '2026-10-20', '2026-10-18', 'Troca de tomada',          '2026-10-12 15:00:00-03'),
    (3, 7, 'estrutura',  'baixa', 'whatsapp', 'Rachadura no reboco do corredor',     'em_analise',  NULL,    NULL, NULL,      NULL,         NULL,                       '2026-11-15 13:20:00-03'),
    (3, 7, 'outros',     'media', 'sistema',  'Portão da garagem emperrado',         'aberto',      NULL,    NULL, NULL,      NULL,         NULL,                       '2026-11-18 08:05:00-03'),
    (1, 6, 'hidraulica', 'alta',  'sistema',  'Entupimento do ralo do banheiro',     'concluido',   'alta',  3, '2026-09-10', '2026-09-08', 'Desentupimento realizado', '2026-09-05 17:00:00-03');

INSERT INTO chamado_historico (chamado_id, descricao, criado_em) VALUES
    (1, 'Chamado aberto',                                         '2026-11-03 09:00:00-03'),
    (1, 'Chamado em análise pela equipe',                         '2026-11-04 10:00:00-03'),
    (1, 'Serviço em execução - responsável: Carlos Pereira',      '2026-11-05 08:30:00-03'),
    (2, 'Chamado aberto',                                         '2026-10-12 15:00:00-03'),
    (2, 'Concluído: Troca de tomada',                             '2026-10-18 11:00:00-03'),
    (3, 'Chamado registrado pela equipe (canal: WhatsApp)',       '2026-11-15 13:20:00-03'),
    (4, 'Chamado aberto',                                         '2026-11-18 08:05:00-03'),
    (5, 'Chamado aberto',                                         '2026-09-05 17:00:00-03'),
    (5, 'Concluído: Desentupimento realizado',                    '2026-09-08 09:00:00-03');
