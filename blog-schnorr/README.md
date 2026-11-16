# Blog Schnorr — Direito & Negócios

Blog estático preparado para `https://blog.advschnorr.com.br`, com identidade do site institucional e publicação por arquivos editoriais que a Estela pode gerar e enviar ao repositório.

## Estado da entrega

- Projeto e prévia local concluídos; nenhuma publicação remota foi executada.
- A pasta `dist/` contém uma **prévia demonstrativa**, com seis rascunhos identificados e bloqueio de indexação. Não subir essa pasta como se contivesse artigos revisados.
- A versão de produção é gerada sem `--demo`. Rascunhos e artigos com data futura não são incluídos.
- O repositório separado do blog, GitHub Pages, DNS e conexão da Estela ainda precisam ser configurados. A página institucional em produção não foi alterada; o projeto foi preparado para entrega em branch isolada.

## O que Fábio fará

Enviar à Estela uma mensagem como: “Tema de hoje: revisão de contratos com fornecedores. Público: empresários. Tom: prático.” A Estela pesquisa, redige, confere fontes e publica pelo fluxo documentado em `docs/ESTELA.md`. O processo só poderá ser chamado de automático depois de uma publicação real validada no domínio.

## Executar e testar

Não há instalação de dependências. Requer Python 3.10+.

```sh
# Na pasta do projeto:
python3 -m unittest discover -s tests -v
python3 scripts/build.py --demo
python3 -m http.server 8090 --directory dist
```

Abrir `http://localhost:8090/`.

```sh
# Validar e incluir o artigo preparado pela Estela:
python3 scripts/publish.py --input artigo.json
# Atualizar um artigo existente mantendo o mesmo slug:
python3 scripts/publish.py --input artigo.json --replace
# Gerar somente o conteúdo efetivamente publicável:
python3 scripts/build.py
```

Depois, enviar os arquivos `content/*.json` ao repositório pelo acesso autenticado da Estela. O workflow testa, gera e publica no GitHub Pages. Em Netlify/Vercel, usar `python3 scripts/build.py` como build e `dist` como diretório estático.

O cron diário apenas reconstrói o blog para liberar artigos que já estejam escritos e marcados para publicação. Ele **não escreve artigos nem recebe mensagens da Estela**. GitHub Actions pode atrasar ou suspender agendamentos conforme as regras do serviço; sempre conferir a publicação.

## Ligação com o site institucional

Depois que o subdomínio estiver funcionando, acrescentar no menu e rodapé do site:

```html
<a href="https://blog.advschnorr.com.br/">Blog ↗</a>
```

A navegação do blog já aponta para o site institucional e o formulário de atendimento existente. Não requer mudanças em e-mail, WhatsApp ou área do cliente.

## Arquivos

- `content/`: artigos JSON, um arquivo por slug.
- `templates/`: página inicial e leitura dos artigos.
- `assets/`: estilos, interações e imagens otimizadas.
- `scripts/`: validação, ingestão e geração das páginas.
- `.github/workflows/blog.yml`: testes e publicação no Pages.
- `docs/`: instalação, instruções da Estela e padrão editorial.

## Segurança e limites

Sem senhas no navegador, formulário público de publicação ou credenciais no projeto. O HTML dos artigos é escapado; somente um subconjunto de Markdown é aceito. Links e fontes devem usar HTTPS. Os rascunhos ficam fora do site público, mas se o repositório for público seus arquivos de origem serão visíveis: não incluir informações confidenciais. Toda publicação marcada `published` exige ao menos uma fonte; isso valida a estrutura, não a veracidade jurídica, que depende da checagem editorial da Estela.

Busca e filtros funcionam sobre os cartões carregados no HTML. O gerador produz páginas por artigo, RSS, sitemap, metadados e links canônicos. O projeto usa fontes do sistema e não depende de CDNs, rastreadores ou plugins pagos.
