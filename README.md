# M3U Collector Web

Reimplementação web independente das funções observadas no M3uCollector V5.2, mantendo o executável original intacto.

## Recursos

- Até 5 servidores Xtream.
- Teste de conexão.
- Coleta de canais, filmes e séries.
- Séries com tentativa de expansão para temporadas/episódios reais via `get_series_info`.
- Importação de M3U/M3U8/TXT e colagem direta.
- Filtros por nome, grupo e servidor.
- Regras de categoria/renomeação: contém, começa com e Regex.
- Renomeação ou mudança de grupo por regras.
- Editor em massa de nome, grupo e logo.
- Deduplicação avançada por URL e por combinação nome + URL.
- Teste de stream no servidor, sem expor a URL diretamente ao navegador.
- Exportação geral, por grupo e por servidor.
- Exportação por múltiplos critérios.
- Histórico local das operações.
- Painel protegido por sessão HTTP-only.
- O executável original permanece intacto.
- A branch `main` não é alterada.

## Autenticação

Por padrão o painel inicia com:

- Usuário: `admin`
- Senha: `admin123`

**Para produção, altere obrigatoriamente**:

```bash
export PANEL_USER="seu_usuario"
export PANEL_PASSWORD="uma_senha_forte"
npm start
```

A sessão usa cookie HTTP-only e expira após 12 horas.

## Executar

Node.js 18+:

```bash
npm start
```

Abra `http://localhost:3000`.

## Segurança

As credenciais Xtream são usadas para chamadas ao backend. A versão atual mantém a configuração dos servidores no armazenamento local do navegador para facilitar o uso; para uma instalação pública, recomenda-se HTTPS e uma etapa posterior de armazenamento seguro no servidor.

O sistema não reproduz os endpoints externos de licença/upload encontrados no executável original.

## Próximos aprimoramentos

- Exportação ZIP de múltiplos arquivos.
- Persistência de regras e histórico no banco.
- Perfis/permissões de usuários.
- Preview HLS com player quando o navegador e o servidor permitirem.
- Proxy de mídia opcional para ambientes com Mixed Content.
- Regras de renomeação em lote mais avançadas.
