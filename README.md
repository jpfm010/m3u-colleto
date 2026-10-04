# M3U Collector Web

Reimplementação web independente das funções observadas no M3uCollector V5.2.

## Recursos atuais
- Até 5 servidores Xtream.
- Teste de conexão.
- Coleta de canais, filmes e séries.
- Coleta de todos os servidores.
- Importação de arquivos M3U/M3U8/TXT.
- Colar M3U diretamente no painel.
- Filtro por nome, grupo e servidor.
- Edição de nome, grupo e logo.
- Exclusão individual.
- Seleção individual, todos ou nenhum.
- Remoção de duplicados por URL.
- Agrupamento por categoria.
- Exportação M3U geral.
- Exportação separada por grupo.
- Exportação separada por servidor.
- O executável original permanece intacto.
- Não reproduz os endpoints externos de licença/upload encontrados no executável.

## Executar

Node.js 18+:

    npm start

Abra http://localhost:3000.

## Próxima fase
- Gerenciamento de categorias com regras de renomeação.
- Editor em massa.
- Deduplicação avançada por nome + URL.
- Preview/teste de stream.
- Geração de playlists por múltiplos critérios.
- Histórico de operações.
- Autenticação do painel.
