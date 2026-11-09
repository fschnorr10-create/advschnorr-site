# Guia editorial do blog Schnorr

## Pedido simples

O Fábio pode enviar apenas o tema ou a manchete, por exemplo:

> Estela, publique um artigo sobre **[tema ou link da notícia]**, explicando o impacto para **[empresas, produtores rurais ou outro público]**.

Para preparar sem publicar:

> Estela, prepare um rascunho sobre **[tema]**.

Público, formato e extensão são opcionais. Se não forem indicados, usar linguagem acessível para gestores, um título informativo e extensão suficiente para explicar a consequência prática. A pesquisa deve resolver os detalhes disponíveis; perguntar somente pelo dado essencial que continuar faltando.

## Oito categorias

Selecionar uma categoria principal. Usar tags opcionais para recortes e assuntos relacionados.

| Categoria | Pautas usuais |
| --- | --- |
| Trabalhista e relações coletivas | Rotina do empregador, relações sindicais, negociações coletivas, acordos e convenções |
| Compliance trabalhista e SST | Auditoria, prevenção de passivos, práticas internas, documentação e saúde e segurança no trabalho |
| Tributário | Obrigações fiscais, regularização, mudanças normativas e impactos para a gestão |
| Imobiliário e regularização fundiária | Documentação de imóveis, negócios imobiliários e regularização urbana e rural |
| Negociação bancária e crédito rural | Contratos bancários, financiamento rural e negociação de dívidas |
| Empresarial, societário e contratos | Gestão de riscos contratuais, relações entre sócios e organização empresarial |
| Agronegócio e cooperativas | Questões jurídicas da atividade rural, cooperativismo e cadeias produtivas |
| Cível e resolução de conflitos | Negociação, cobrança, responsabilidade e alternativas de solução de conflitos |

A categoria descreve o assunto do artigo; não certifica especialidade nem dispensa verificar a adequação da orientação ao caso concreto.

## Estrutura recomendada

1. **Título:** indicar o tema e sua consequência, sem prometer resultado.
2. **Resumo:** explicar em duas ou três frases por que o leitor deveria continuar.
3. **Abertura:** apresentar o que ocorreu ou qual dúvida será resolvida.
4. **Contexto verificado:** explicar a norma, decisão, dado ou prática, com links para a fonte primária.
5. **Impacto prático:** mostrar o que muda para o público, distinguindo obrigação de recomendação.
6. **Próximos passos:** listar providências concretas e os pontos que dependem de análise individual.
7. **Fechamento:** concluir o raciocínio. Quando pertinente, incluir um convite discreto para conversar com o escritório.

Nem toda pauta exige todos os subtítulos. A sequência deve servir ao texto; não transformar cada artigo em um formulário.

## Tom e precisão

- Escrever em português do Brasil, com frases claras e termos técnicos explicados quando necessários.
- Apresentar o problema e a consequência logo no começo. Evitar introduções genéricas sobre a importância do direito.
- Distinguir fatos, hipóteses, interpretação e orientação. Não criar certeza onde a fonte oferece apenas indícios.
- Verificar datas e vigência na pesquisa de cada pauta. Um projeto de lei não deve ser descrito como obrigação já vigente.
- Não inventar estatísticas, números de processos, citações, julgados, rankings ou experiências do escritório. Informação interna e dados de clientes só entram quando houver base e escopo de divulgação definidos.
- Citar a página ou o documento oficial específico. Não usar apenas a página inicial do órgão como sustentação de uma afirmação.
- Em informação trabalhista coletiva, explicitar o recorte de categoria, território e vigência quando ele alterar a conclusão.
- Não transformar notícia de investigação em conclusão de responsabilidade. Não inferir ausência de documento a partir de extração incompleta.
- Evitar promessas de êxito, linguagem sensacionalista e a apresentação de soluções universais. A utilidade do artigo vem da análise e da clareza.
- Preservar sigilo e dados pessoais. Exemplos devem ser públicos, autorizados ou construídos sem identificar pessoas reais.

## Metadados e manutenção

O `excerpt` deve resumir o artigo, não repetir o título. O slug deve permanecer estável para preservar o endereço. Datas devem conter fuso horário, e `reviewed_at` deve refletir a checagem efetivamente realizada. Não atualizar a data para aparentar uma revisão inexistente.

Se uma norma ou decisão posterior mudar a análise, revisar o texto, atualizar as fontes e registrar a nova data de revisão. Correções materiais devem ser transparentes no próprio artigo. Para retificar um arquivo existente, usar `scripts/publish.py --input arquivo.json --replace` e revisar o diff antes do envio.

## Quando o conteúdo fica em rascunho

Usar `status: draft` se o pedido for de rascunho, se uma premissa essencial não estiver comprovada ou se faltar informação indispensável ao alcance da orientação. Registrar o ponto pendente de forma objetiva. Conteúdo demonstrativo usado no modo de prévia não deve ser convertido em publicação real sem pesquisa e revisão.

O estado `published` só indica que o arquivo está apto à saída pública. A implantação e a checagem da URL pertencem ao fluxo operacional de `ESTELA.md`.
