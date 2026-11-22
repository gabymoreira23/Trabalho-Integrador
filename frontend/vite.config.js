import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Em desenvolvimento (npm run dev) o Vite serve o React em :5173 e repassa as chamadas
// da API para o backend em :3000. Assim o navegador enxerga uma única origem, e o cookie
// do refresh token (path /auth) funciona igual ao de produção.
const ROTAS_DA_API = ['/auth', '/dashboard', '/chamados', '/pessoas', '/imoveis', '/contratos', '/vistorias'];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(ROTAS_DA_API.map((rota) => [rota, 'http://localhost:3000'])),
  },
});
