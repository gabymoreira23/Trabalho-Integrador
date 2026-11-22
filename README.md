# Fênix Imóveis — Gestão de Vistorias e Chamados de Manutenção

## Pré-requisitos

- **Node.js 20.19 ou superior** (já inclui o `npm`)
- **PostgreSQL** instalado e em execução

## Bibliotecas necessárias

Todas são instaladas automaticamente com `npm install` (o `postinstall` instala também as do `frontend/`).

**Backend** (`package.json`)

| Biblioteca | Versão | Uso |
|---|---|---|
| express | ^5.2.1 | servidor e rotas da API |
| sequelize | ^6.37.7 | acesso ao banco (ORM) |
| pg / pg-hstore | ^8.16.3 / ^2.3.4 | driver do PostgreSQL |
| passport / passport-jwt | ^0.7.0 / ^4.0.1 | autenticação |
| jsonwebtoken | ^9.0.3 | tokens JWT |
| bcrypt | ^6.0.0 | criptografia das senhas |
| cookie-parser | ^1.4.7 | leitura de cookies |
| dotenv | ^17.4.2 | variáveis de ambiente (`.env`) |
| nodemon (dev) | ^3.1.10 | reinício automático em desenvolvimento |

**Frontend** (`frontend/package.json`)

| Biblioteca | Versão |
|---|---|
| react / react-dom | ^19.3.1 |
| vite (dev) | ^8.3.8 |
| @vitejs/plugin-react (dev) | ^6.3.0 |

## Como executar

**1. Instalar as dependências**

```bash
npm install
```

**2. Criar o arquivo `.env`** na raiz do projeto (mesma pasta do `package.json`), com o conteúdo abaixo. Ajuste `DB_USER` e `DB_PASSWORD` para as credenciais do seu PostgreSQL.

```env
# Banco de dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fenix
DB_USER=postgres
DB_PASSWORD=postgres

# Servidor
PORT=3000
NODE_ENV=development

# Segredos (mínimo de 32 caracteres e DIFERENTES entre si)
JWT_SECRET=troque-por-um-segredo-longo-e-aleatorio
REFRESH_SECRET=troque-por-outro-segredo-longo-e-diferente
JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_IN=7d
```

Para gerar um segredo forte (rode duas vezes, um para cada variável):

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**3. Criar o banco, as tabelas e os dados iniciais** (veja a seção *Banco de dados* abaixo)

```bash
npm run setup
```

**4. Compilar o frontend**

```bash
npm run build
```

**5. Iniciar o servidor**

```bash
npm start
```

Abra **http://localhost:3000** no navegador.

**Modo desenvolvimento** (opcional): em dois terminais, rode `npm run dev` (backend, porta 3000) e `npm run dev:frontend` (frontend, porta 5173). Acesse **http://localhost:5173**.

## Banco de dados

O script **`database/fenix.sql`** cria todas as tabelas e insere os dados necessários para a operação inicial do sistema (usuários, imóveis e contratos de exemplo).

> Atenção: o script **apaga e recria** as tabelas.

Há duas formas de executá-lo:

- **Pelo npm** (cria o banco `fenix` se ele não existir e executa o script):

  ```bash
  npm run setup
  ```

- **Pelo `psql`:**

  ```bash
  psql -U postgres -c "CREATE DATABASE fenix;"
  psql -U postgres -d fenix -f database/fenix.sql
  ```

### Usuários para o primeiro acesso (criados pelo `fenix.sql`)

| Perfil | Usuário | Senha |
|---|---|---|
| Funcionário | `admin` | `admin123` |
| Funcionário | `carlos` / `ana` | `carlos123` / `ana12345` |
| Inquilino | `maria` / `pedro` | `maria123` / `pedro123` |
| Proprietário | `joao` / `cintia` | `joao123` / `cintia123` |

Use `admin` / `admin123` para acessar todas as telas. São senhas de teste; troque-as pela tela **Pessoas** em uso real.
