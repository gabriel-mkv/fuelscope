# FuelScope

Monitoramento de preços de combustíveis em **Pará de Minas (MG)**, a partir do levantamento semanal da [ANP](https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc).

O FuelScope baixa as planilhas mais recentes da ANP, extrai os preços dos postos da cidade e mantém arquivos JSON atualizados com o histórico e os preços atuais. Esses arquivos alimentam o site do projeto, que será publicado no GitHub Pages.

## Funcionalidades

- Coleta automática das planilhas semanais da ANP, tolerante a semanas ainda não publicadas
- Filtro por município e estado configuráveis
- Histórico de 12 meses e preço atual por posto e produto
- Atualização idempotente: reexecutar não gera duplicatas e correções da ANP são incorporadas
- Gravação atômica dos arquivos, sem risco de JSON incompleto

## Como funciona

```
ANP (.xlsx semanal) → download → leitura da planilha → merge no histórico → JSON
```

A cada execução são verificadas as últimas semanas (4 por padrão), pois a ANP pode publicar com atraso ou reenviar arquivos corrigidos. Os registros são identificados por `(CNPJ, produto, data da coleta)`. A aplicação roda uma vez e encerra com código `0` em caso de sucesso ou `1` em caso de falha, o que a torna adequada para pipelines agendados.

## Dados gerados

| Arquivo | Conteúdo |
|---|---|
| `data/fuel-history.json` | Coletas dos últimos 12 meses |
| `data/fuel-prices.json` | Preço mais recente de cada posto e produto |

Combustíveis incluídos: gasolina comum, gasolina aditivada, etanol, diesel S10, diesel S500 e GNV.

```json
{
  "cnpj": "08220930000162",
  "legalName": "RAZAO SOCIAL LTDA",
  "tradeName": "NOME FANTASIA",
  "address": "RUA EXEMPLO",
  "neighborhood": "CENTRO",
  "brand": "BANDEIRA",
  "product": "GASOLINA COMUM",
  "price": 6.29,
  "collectionDate": "2026-09-29"
}
```

## Início rápido

Requer **JDK 21**.

```shell
./mvnw package
java -jar target/quarkus-app/quarkus-run.jar
```

Os arquivos são gravados em `./data/`.

## Configuração

Definida em `src/main/resources/application.properties`:

| Propriedade | Padrão | Descrição |
|---|---|---|
| `fuelscope.anp-municipality` | `PARA DE MINAS` | Município a filtrar |
| `fuelscope.anp-state` | `MINAS GERAIS` | Estado do município |
| `fuelscope.anp-weeks-to-check` | `4` | Semanas verificadas por execução |

Os valores podem ser sobrescritos por propriedade de sistema (`-Dfuelscope.anp-weeks-to-check=8`) ou variável de ambiente (`FUELSCOPE_ANP_WEEKS_TO_CHECK=8`).

## Testes

```shell
./mvnw verify
```

A suíte não acessa a ANP nem depende da data atual: planilhas são geradas em memória, o download usa um servidor HTTP local e o relógio é fixo. A CI executa o mesmo comando a cada push e pull request na `main`.

## Estrutura

```
fuelscope/
├── .github/
│   └── workflows/
│       └── ci.yml                          # build e testes a cada push/PR
├── .mvn/wrapper/
│   └── maven-wrapper.properties
├── data/                                   # gerado na execução (ignorado pelo Git)
│   ├── fuel-history.json
│   └── fuel-prices.json
├── src/
│   ├── main/
│   │   ├── java/com/gabrielmkv/
│   │   │   ├── AnpUpdateApplication.java  # ponto de entrada
│   │   │   ├── model/
│   │   │   │   └── FuelPrice.java         # registro de preço
│   │   │   └── service/
│   │   │       ├── AnpDownloadService.java # URLs semanais e download
│   │   │       ├── AnpParserService.java   # leitura do .xlsx
│   │   │       ├── AnpUpdateService.java   # orquestração do fluxo
│   │   │       └── FuelDataService.java    # merge e persistência em JSON
│   │   └── resources/
│   │       └── application.properties      # configuração
│   └── test/
│       └── java/com/gabrielmkv/service/
│           ├── AnpDownloadServiceTest.java
│           ├── AnpParserServiceTest.java
│           └── FuelDataServiceTest.java
├── mvnw / mvnw.cmd                         # Maven Wrapper
├── pom.xml
└── README.md
```

## Fonte dos dados

Dados do levantamento de preços de revenda da ANP. Este projeto não é afiliado à ANP, e os valores refletem as coletas da agência, podendo diferir do preço praticado no posto.