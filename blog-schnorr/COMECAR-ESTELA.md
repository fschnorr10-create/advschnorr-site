# Ativação do blog pela Estela

Fábio confirmou que a Estela já possui acesso para atualizar o GitHub. Este documento prepara a instalação; não comprova teste dessa conexão ou publicação do blog.

## Onde está o projeto

Repositório de entrega: `fschnorr10-create/advschnorr-site`.
Branch de entrega: `codex/blog-schnorr-estela`.
Pasta: `blog-schnorr/`.

A branch é uma entrega isolada. A página institucional em produção não foi substituída. O workflow dentro de `blog-schnorr/.github/workflows/` só se torna ativo quando o projeto for instalado na raiz do repositório definitivo do blog.

## Instalação inicial

1. Criar o repositório separado `blog-advschnorr`, na conta confirmada de Fábio. Copiar o CONTEÚDO da pasta `blog-schnorr/` para a raiz desse repositório, incluindo `.github/` e `.gitignore`.
2. Ler `docs/INSTALACAO.md`, ativar Pages com GitHub Actions e executar os testes/build em produção. Não usar `--demo` em produção.
3. Configurar o domínio do Pages como `blog.advschnorr.com.br` e o CNAME no provedor DNS. Confirmar destino e HTTPS antes de concluir. Preservar o domínio principal, área do cliente e e-mail.
4. Conectar a Estela ao repositório definitivo usando o acesso que ela já possui, limitado ao necessário. Nenhuma senha ou token deve ficar no código.
5. Publicar e verificar o primeiro artigo real. Os seis arquivos recebidos são rascunhos demonstrativos e não são publicados no build normal.
6. Após confirmar o subdomínio, inserir o link Blog no menu do site institucional.

## Rotina combinada com Fábio

Ele envia somente uma pauta, manchete ou pergunta. A Estela pesquisa, confere fontes, redige, valida, envia o artigo ao repositório e acompanha a implantação. Não pedir nova confirmação a cada pauta desse fluxo, salvo se ele solicitar rascunho ou faltar informação factual indispensável.

Seguir o contrato e os comandos de `docs/ESTELA.md`. Só informar “publicado” após abrir a URL pública e conferir o resultado.
