# FuelScope

O **FuelScope** coleta, organiza e apresenta os preços de combustíveis divulgados pela Agência Nacional do Petróleo, Gás Natural e Biocombustíveis ([ANP](https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc)) para **Pará de Minas (MG)**.

O projeto combina um backend em Java 21 com Quarkus, responsável pela coleta e persistência dos dados, e um site estático em TypeScript que permite consultar os preços, aplicar filtros e visualizar um ranking dos postos.

## Funcionalidades

- Download e processamento das planilhas semanais de preços da ANP.
- Filtro dos dados por município e estado.
- Consulta de preços atuais e histórico de coletas dos últimos 12 meses.
- Atualização idempotente, com incorporação de correções publicadas pela ANP.
- Gravação dos arquivos JSON com substituição atômica.
- Site estático com filtros por combustível, bandeira, bairro e nome do posto.
- Resumo dos preços mínimo, médio e máximo.
- Ranking de postos do menor para o maior preço, com links para o Google Maps.
- Aviso quando a coleta mais recente exibida no site está desatualizada.
- Automação de testes, build, atualização dos dados e publicação pelo GitHub Actions.

## Arquitetura

O fluxo principal de dados é:

```text
ANP
 │
 ▼
Planilhas semanais (.xlsx)
 │
 ▼
Backend Java + Quarkus
 │
 ├── Download das semanas recentes
 ├── Leitura e filtragem das planilhas
 ├── Merge idempotente do histórico
 └── Geração dos arquivos JSON
          │
          ▼
     data/*.json
          │
          ▼
    Build do site
          │
          ▼
    web/dist/
          │
          ▼
     GitHub Pages
```

O backend é executado como uma aplicação de linha de comando: processa as semanas configuradas, atualiza os arquivos de dados e encerra a execução com sucesso ou falha.

O site não depende de um servidor Java em tempo de consulta. Ele utiliza JavaScript no navegador e carrega os arquivos JSON publicados junto com os demais recursos estáticos.

## Tecnologias

| Componente | Tecnologia |
|---|---|
| Backend | Java 21, Quarkus e Maven |
| Processamento de planilhas | Apache POI |
| Serialização JSON | Jackson |
| Front-end | TypeScript e HTML/CSS |
| Build do front-end | esbuild |
| Testes do backend | JUnit com integração Quarkus |
| Testes do front-end | Vitest |
| Automação | GitHub Actions |
| Hospedagem do site | GitHub Pages |

## Dados gerados

Os arquivos ficam no diretório `data/` na raiz do repositório.

| Arquivo | Conteúdo |
|---|---|
| `data/fuel-history.json` | Histórico das coletas dos últimos 12 meses. |
| `data/fuel-prices.json` | Preços mais recentes considerados atuais para cada posto e produto. |

O histórico é mantido por uma janela móvel de 12 meses. Para compor os preços atuais, o backend considera as coletas dentro de uma janela de 14 dias em relação à coleta mais recente do histórico.

Os registros utilizam o seguinte formato:

```json
{
  "cnpj": "08220930000162",
  "legalName": "RAZAO SOCIAL LTDA",
  "tradeName": "NOME FANTASIA",
  "address": "RUA EXEMPLO, 123",
  "neighborhood": "CENTRO",
  "brand": "BANDEIRA",
  "product": "GASOLINA COMUM",
  "price": 6.29,
  "collectionDate": "2026-09-29"
}
```

O campo `price` é numérico, e `collectionDate` utiliza o formato `yyyy-MM-dd`.

**Contrato dos JSON:** os arquivos são consumidos diretamente pelo front-end. Alterações nos nomes, tipos ou significados dos campos precisam considerar a compatibilidade com o site.

### Regras de atualização

- A aplicação verifica várias semanas recentes, pois a ANP pode publicar planilhas com atraso ou disponibilizar correções.
- A chave de deduplicação do histórico é a combinação `(CNPJ, produto, data da coleta)`.
- Uma nova execução não deve duplicar registros. Se a ANP corrigir um registro com a mesma chave, o valor novo substitui o anterior.
- O diretório de destino dos dados é determinado pelo ano do sábado final da semana de referência.
- Os arquivos JSON são escritos em arquivos temporários e substituídos por movimentação atômica quando suportada pelo sistema de arquivos.

Combustíveis incluídos no processamento: gasolina comum, gasolina aditivada, etanol, diesel S10, diesel S500 e GNV.

## Executar o backend localmente

### Pré-requisitos

- JDK 21.
- Maven Wrapper incluído no repositório.
- Acesso à internet para baixar as planilhas da ANP.

Na raiz do projeto, gere a aplicação:

```bash
./mvnw package
```

Execute o artefato gerado:

```bash
java -jar target/quarkus-app/quarkus-run.jar
```

A aplicação processará as semanas configuradas e gravará os arquivos JSON em `data/`.

No Windows, utilize `mvnw.cmd` no lugar de `./mvnw`.

## Configuração do backend

As configurações padrão estão em `src/main/resources/application.properties`.

| Propriedade | Padrão | Descrição |
|---|---|---|
| `fuelscope.anp-municipality` | `PARA DE MINAS` | Município a filtrar. |
| `fuelscope.anp-state` | `MINAS GERAIS` | Estado a filtrar. |
| `fuelscope.anp-weeks-to-check` | `4` | Quantidade de semanas recentes verificadas em cada execução. |

Os valores podem ser sobrescritos por propriedades de sistema ou variáveis de ambiente reconhecidas pelo Quarkus.

Por exemplo, para verificar oito semanas:

```bash
java -Dfuelscope.anp-weeks-to-check=8 \
  -jar target/quarkus-app/quarkus-run.jar
```

A variável de ambiente correspondente é `FUELSCOPE_ANP_WEEKS_TO_CHECK`.

## Executar o front-end localmente

### Pré-requisitos

- Node.js 22, a mesma versão utilizada nos workflows de CI e publicação.
- npm.

Entre no diretório `web/` e instale as dependências:

```bash
cd web
npm ci
```

### Testes e build

Execute os testes:

```bash
npm test
```

Gere o site estático:

```bash
npm run build
```

O build executa primeiro a verificação de tipos do TypeScript e, em seguida, o script `scripts/build.mjs`. O resultado é gerado em `web/dist/`, incluindo o JavaScript compilado, os arquivos públicos e os JSON disponíveis em `data/`.

Para visualizar o site localmente após o build:

```bash
npm run serve
```

O servidor local utiliza a porta `8080`. Abra `http://localhost:8080` no navegador.

**Observação:** se os arquivos JSON ainda não existirem, execute o backend primeiro. O build avisa quando não encontra o diretório `data/`, mas não executa a coleta automaticamente.

## Testes

O backend e o front-end possuem suítes de testes separadas.

### Backend

Na raiz do projeto:

```bash
./mvnw verify
```

Esse comando executa as fases de compilação, testes e verificação de integração configuradas no Maven.

### Front-end

Dentro de `web/`:

```bash
npm ci
npm test
npm run build
```

O build também valida os tipos TypeScript por meio do `tsc`.

## Automação com GitHub Actions

O projeto possui três workflows com responsabilidades distintas.

| Workflow | Gatilho | Responsabilidade |
|---|---|---|
| `ci.yml` | Push ou pull request para `main`, ou execução manual | Executa `./mvnw verify`, instala as dependências do front-end, roda `npm test` e `npm run build`. |
| `deploy-pages.yml` | Alterações em `web/**` ou no próprio workflow, em `main`, ou execução manual | Gera o site e publica o artefato no GitHub Pages. |
| `update-anp-data.yml` | Agendamento semanal ou execução manual | Executa o backend, atualiza os JSON, registra alterações nos dados e publica o site atualizado. |

### Atualização automática dos dados

O workflow `update-anp-data.yml` está agendado para terças-feiras às 13h UTC, correspondentes a 10h no horário de Brasília.

O fluxo é:

1. Compila o backend.
2. Executa a coleta e atualiza os arquivos JSON.
3. Cria um commit automatizado apenas quando os dados mudam.
4. Compila o front-end.
5. Publica o site atualizado no GitHub Pages.

A atualização dos dados e a publicação do site são feitas no mesmo workflow para que o site seja reconstruído com os dados recém-gerados.

### CI e publicação do site

O workflow `ci.yml` valida o backend e o front-end, mas não publica o site.

Já o workflow `deploy-pages.yml` é responsável pela publicação em resposta a alterações no front-end. Assim, a validação do código e a publicação são processos separados, enquanto a atualização programada dos dados possui seu próprio fluxo de publicação.

A execução efetiva desses workflows depende das configurações e permissões do repositório no GitHub.

## Estrutura do projeto

```text
fuelscope/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-pages.yml
│       └── update-anp-data.yml
├── .mvn/
│   └── wrapper/
├── data/
│   ├── fuel-history.json
│   └── fuel-prices.json
├── src/
│   ├── main/
│   │   ├── java/com/gabrielmkv/
│   │   │   ├── AnpUpdateApplication.java
│   │   │   ├── model/
│   │   │   │   └── FuelPrice.java
│   │   │   └── service/
│   │   │       ├── AnpDownloadService.java
│   │   │       ├── AnpParserService.java
│   │   │       ├── AnpUpdateService.java
│   │   │       └── FuelDataService.java
│   │   └── resources/
│   │       └── application.properties
│   └── test/
│       └── java/com/gabrielmkv/service/
│           ├── AnpDownloadServiceTest.java
│           ├── AnpParserServiceTest.java
│           └── FuelDataServiceTest.java
├── web/
│   ├── public/
│   │   ├── index.html
│   │   └── styles.css
│   ├── scripts/
│   │   └── build.mjs
│   ├── src/
│   │   ├── components/
│   │   │   └── view.ts
│   │   ├── features/
│   │   │   ├── filters/
│   │   │   │   ├── filters.ts
│   │   │   │   ├── state.ts
│   │   │   │   └── urlState.ts
│   │   │   ├── maps/
│   │   │   │   └── maps.ts
│   │   │   ├── prices/
│   │   │   │   └── data.ts
│   │   │   └── ranking/
│   │   │       └── ranking.ts
│   │   ├── shared/
│   │   │   ├── dom.ts
│   │   │   ├── format.ts
│   │   │   └── types.ts
│   │   └── main.ts
│   ├── test/
│   │   ├── features/
│   │   │   ├── filters/
│   │   │   │   ├── filters.test.ts
│   │   │   │   ├── state.test.ts
│   │   │   │   └── urlState.test.ts
│   │   │   ├── maps/
│   │   │   │   └── maps.test.ts
│   │   │   ├── prices/
│   │   │   │   └── data.test.ts
│   │   │   └── ranking/
│   │   │       └── ranking.test.ts
│   │   ├── shared/
│   │   │   └── format.test.ts
│   │   └── helpers.ts
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
├── .gitignore
├── mvnw
├── mvnw.cmd
├── pom.xml
└── README.md
```

## Fonte dos dados e responsabilidade

Os dados são provenientes do levantamento de preços de revenda da ANP. O FuelScope organiza e apresenta essas informações, mas não é afiliado à agência.
Os valores publicados refletem as coletas disponibilizadas pela ANP e podem diferir dos preços praticados nos postos no momento da consulta.
