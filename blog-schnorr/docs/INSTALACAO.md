# Instalação do blog Schnorr

## Estado e arquitetura

O pacote é um blog estático gerado a partir de artigos JSON. O levantamento desta tarefa identificou o site institucional como estático e o repositório `fschnorr10-create/advschnorr-site` como acessível. Isso não comprova a criação do repositório do blog, conexão da Estela, configuração de Pages, alteração de DNS ou publicação do subdomínio. Revalidar esses pontos antes de qualquer mudança remota.

Recomenda-se um repositório separado, por exemplo `fschnorr10-create/blog-schnorr`, para servir `blog.advschnorr.com.br`. Cada site Pages tem sua configuração de domínio; separar os repositórios permite manter a página institucional e o blog com ciclos de publicação próprios. Os tipos de domínio e a possibilidade de definir um domínio específico por projeto estão na [documentação oficial de domínios do GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages).

## Antes da instalação

- Confirmar a conta autenticada, a propriedade/administração do repositório de destino e o acesso autorizado à zona DNS.
- Conferir o domínio atualmente configurado no repositório institucional e registrar os valores existentes de `@`, `www`, MX e TXT de e-mail.
- Guardar uma cópia dos registros DNS antes da mudança. Alterar somente o host do blog nesta instalação.
- Confirmar onde a Estela executará os comandos e guardará sua conexão GitHub. O navegador dos visitantes não publica artigos.

## Prévia e build de produção

Na raiz do pacote, com Python 3 disponível:

```bash
python3 scripts/build.py --demo
python3 -m http.server 8080 --directory dist
```

Abrir `http://localhost:8080/`. Esse modo é uma prévia local; conteúdo demonstrativo não deve chegar à produção.

Para preparar a saída de produção:

```bash
python3 scripts/build.py
```

O diretório a hospedar é `dist/`. Artigos de rascunho não devem ser expostos na saída pública. Conferir o resultado e corrigir qualquer erro antes de enviar o código ao remoto.

## GitHub Pages

1. Criar ou selecionar o repositório exclusivo do blog na conta proprietária confirmada. Não reutilizar o repositório institucional para substituir sua configuração de domínio.
2. Enviar os arquivos do projeto, incluindo o workflow de publicação. Antes de qualquer push, usar `git remote -v` e confirmar proprietário, nome e branch.
3. No repositório, abrir **Settings → Pages** e escolher **GitHub Actions** como origem.
4. O workflow deve executar `python3 scripts/build.py`, carregar `dist/` como artefato e realizar o deploy no ambiente `github-pages`. A permissão do job de deploy deve incluir `pages: write` e `id-token: write`; leitura do código usa `contents: read`. Ver [workflow próprio do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
5. Verificar a propriedade do domínio na conta GitHub e preservar o registro TXT gerado. Conferir cuidadosamente a titularidade antes de verificar domínio em uso por outra conta, pois essa ação pode desvincular sites da outra conta. O procedimento oficial de verificação fica nas configurações **da conta**, não do repositório. Ver [verificação de domínio](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages).
6. Configurar `blog.advschnorr.com.br` no campo **Custom domain** do repositório do blog. Fazer isso antes do apontamento DNS. Em publicação por workflow próprio, um arquivo `CNAME` no artefato não substitui essa configuração. Ver [gerenciamento do domínio no Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
7. Adicionar somente o registro de subdomínio abaixo, depois de confirmar que ele não substitui outro serviço ativo.
8. Acompanhar a verificação DNS e a emissão do certificado. Conferir HTTPS e ativar **Enforce HTTPS** quando disponível. Não concluir a instalação enquanto houver erro de certificado, conteúdo antigo ou URL incorreta.

Exemplo de envio inicial, somente depois de criar e confirmar o repositório e estando na raiz correta:

```bash
git init -b main
git add .
git commit -m "Configura blog institucional Schnorr"
git remote add origin git@github.com:fschnorr10-create/blog-schnorr.git
git remote -v
git push -u origin main
```

Se já existir um repositório local, não repetir `git init` nem sobrescrever seu remoto. Revisar o diff e selecionar os arquivos antes do commit; não enviar segredos, rascunhos confidenciais nem arquivos alheios ao blog.

## DNS do blog e preservação do e-mail

| Tipo | Nome/host | Destino |
| --- | --- | --- |
| CNAME | `blog` | `fschnorr10-create.github.io` |

O destino não leva `https://`, nome de repositório, caminho ou barra. O CNAME aponta diretamente para a conta GitHub confirmada, conforme a [orientação oficial para subdomínios](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

Não apontar `blog` para o apex `advschnorr.com.br` como substituto desse destino. Não alterar `@`, `www`, MX, SPF, DKIM ou DMARC para instalar o blog. Não copiar nem recriar a zona inteira. Um TXT de verificação do GitHub tem finalidade distinta dos TXT de e-mail; manter cada registro em seu host correto. Evitar curingas como `*.advschnorr.com.br`.

Conferências de leitura:

```bash
dig blog.advschnorr.com.br CNAME +short
dig advschnorr.com.br MX +short
curl --head https://blog.advschnorr.com.br/
```

Guardar os resultados antes e depois. Uma resposta HTTP isolada não prova que o conteúdo correto foi implantado: abrir a página e um artigo publicado, conferir texto, links, CSS e HTTPS. A propagação DNS e a disponibilização do certificado podem exigir espera; registrar o estado observado sem afirmar conclusão antecipada.

## Alternativa: Netlify

Conectar o repositório confirmado e configurar:

| Campo | Valor |
| --- | --- |
| Base directory | Raiz do projeto |
| Build command | `python3 scripts/build.py` |
| Publish directory | `dist` |
| Production branch | A branch efetivamente usada pela Estela, normalmente `main` |

Confirmar Python 3 no ambiente de build. O comando e a pasta publicada são campos distintos na [configuração oficial da Netlify](https://docs.netlify.com/build/configure-builds/overview/). Fazer primeiro uma implantação no endereço de prévia da plataforma. Se essa opção for escolhida, usar os registros DNS indicados pela Netlify para o projeto; o CNAME do GitHub acima só vale para a opção GitHub Pages.

## Alternativa: Vercel

Importar o repositório confirmado, selecionar **Other** e configurar:

| Campo | Valor |
| --- | --- |
| Root Directory | Raiz do projeto |
| Build Command | `python3 scripts/build.py` |
| Output Directory | `dist` |

Conferir a presença de Python 3 no ambiente selecionado e o log do primeiro build. Se necessário, construir em um ambiente Python e implantar a saída estática. Os campos de framework, comando e diretório são descritos na [configuração oficial de builds da Vercel](https://vercel.com/docs/builds/configure-a-build). Usar os registros DNS retornados pelo projeto da Vercel se essa plataforma for escolhida.

## Conexão da Estela e primeira publicação

A conexão GitHub precisa existir no ambiente de execução da Estela. Configurar uma credencial com alcance restrito ao repositório do blog; nunca gravar token no HTML, em `content/*.json`, no histórico Git ou em URL. Permitir que a Estela faça commits de conteúdo não exige entregar a ela a administração do DNS em cada publicação.

Após a instalação, executar uma publicação real de conteúdo revisado, acompanhar a execução e comprovar a URL. Usar o protocolo de evidências de `ESTELA.md`. Somente esse teste confirma o fluxo de ponta a ponta. Build local, workflow escrito ou documentação pronta não comprovam automação ativa.

## Recuperação

Se um artigo estiver incorreto, corrigir seu JSON e enviar novo commit; para retirá-lo da saída pública, mudar para `draft`, reconstruir e verificar a URL após o deploy. Se uma implantação quebrar o site, restaurar o commit anterior por um novo commit de reversão e acompanhar o workflow. Não fazer reset forçado de histórico compartilhado como rotina. Retirar o vínculo de hospedagem exige revisar também o apontamento DNS do subdomínio para não deixar um destino desativado.
