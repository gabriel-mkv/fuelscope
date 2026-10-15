package com.gabrielmkv.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.gabrielmkv.model.FuelPrice;

/**
 * Testes unitários puros. As planilhas .xlsx são montadas em memória, no mesmo layout da ANP:
 * linhas de metadados no topo, cabeçalho na linha 10 (índice 9) e uma linha por posto e produto.
 */
class AnpParserServiceTest {

    private static final String SHEET = "POSTOS REVENDEDORES";
    private static final int ANP_METADATA_ROWS = 9;

    /** Cabeçalho idêntico ao da planilha real (com acentos). */
    private static final List<String> HEADER = List.of(
            "CNPJ", "RAZÃO", "FANTASIA", "ENDEREÇO", "NÚMERO", "COMPLEMENTO", "BAIRRO", "CEP",
            "MUNICÍPIO", "ESTADO", "BANDEIRA", "PRODUTO", "UNIDADE DE MEDIDA",
            "PREÇO DE REVENDA", "DATA DA COLETA");

    private static final String CITY = "PARA DE MINAS";
    private static final String STATE = "MINAS GERAIS";
    private static final LocalDate DATE = LocalDate.of(2026, 9, 29);

    private static final String GASOLINA = "GASOLINA COMUM";
    private static final String ETANOL = "ETANOL";

    private AnpParserService parser;

    @BeforeEach
    void setUp() {
        parser = new AnpParserService();
    }

    // ------------------------------------------------------------------ filtro de cidade e estado

    @Test
    @DisplayName("lê apenas as linhas da cidade e do estado pedidos")
    void readsOnlyRowsOfTargetCityAndState() throws IOException {
        byte[] file = defaultWorkbook(List.of(
                rowFor(CITY, STATE),                  // entra
                rowFor("BELO HORIZONTE", STATE),      // outra cidade
                rowFor(CITY, "SAO PAULO")));          // mesmo nome, outro estado

        List<FuelPrice> result = parse(file);

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("compara cidade e estado sem diferenciar acento, caixa e espaços")
    void matchesCityAndStateIgnoringAccentsCaseAndSpaces() throws IOException {
        byte[] file = defaultWorkbook(List.of(
                row(11111111000111L, "RAZAO A", "POSTO A", " PARA DE MINAS ", STATE, GASOLINA, 6.29, DATE),
                row(22222222000122L, "RAZAO B", "POSTO B", "PARÁ DE MINAS", STATE, GASOLINA, 6.39, DATE)));

        List<FuelPrice> result = parser.processingAnpData(
                new ByteArrayInputStream(file), "pará de minas", "Minas Gerais");

        assertEquals(2, result.size());
    }

    // ------------------------------------------------------------------ filtro de produto

    @Test
    @DisplayName("mantém todos os combustíveis veiculares")
    void keepsAllVehicleFuels() throws IOException {
        List<String> products = List.of(
                "GASOLINA COMUM", "GASOLINA ADITIVADA", "ETANOL", "DIESEL S10", "DIESEL S500", "GNV");
        byte[] file = defaultWorkbook(products.stream().map(p -> validRow(p, 6.29)).toList());

        Set<String> found = parse(file).stream().map(FuelPrice::product).collect(Collectors.toSet());

        assertEquals(Set.copyOf(products), found);
    }

    @Test
    @DisplayName("ignora GLP e produtos desconhecidos")
    void ignoresGlpAndUnknownProducts() throws IOException {
        byte[] file = defaultWorkbook(List.of(
                validRow("GLP", 100),
                validRow("QUEROSENE", 5.5),
                validRow(ETANOL, 3.99)));

        List<FuelPrice> result = parse(file);

        assertEquals(1, result.size());
        assertEquals(ETANOL, result.get(0).product());
    }

    // ------------------------------------------------------------------ CNPJ

    @Test
    @DisplayName("restaura os zeros à esquerda do CNPJ numérico")
    void restoresLeadingZerosOfCnpj() throws IOException {
        byte[] file = defaultWorkbook(List.of(
                row(8220930000162L, "CODEPE COMBUSTIVEIS LTDA", "CODEPE", CITY, STATE, GASOLINA, 7.19, DATE)));

        assertEquals("08220930000162", parse(file).get(0).cnpj());
    }

    @Test
    @DisplayName("mantém intacto um CNPJ de 14 dígitos")
    void keepsFullCnpjUntouched() throws IOException {
        byte[] file = defaultWorkbook(List.of(
                row(61602199002409L, "ULTRAGAZ", "ULTRAGAZ", CITY, STATE, GASOLINA, 7.19, DATE)));

        assertEquals("61602199002409", parse(file).get(0).cnpj());
    }

    @Test
    @DisplayName("não perde zeros no fim do CNPJ")
    void keepsTrailingZerosOfCnpj() throws IOException {
        byte[] file = defaultWorkbook(List.of(
                row(12345678000100L, "POSTO ZEROS", "POSTO ZEROS", CITY, STATE, GASOLINA, 6.29, DATE)));

        assertEquals("12345678000100", parse(file).get(0).cnpj());
    }

    @Test
    @DisplayName("aceita CNPJ em texto com pontuação e devolve só os dígitos")
    void acceptsCnpjAsFormattedText() throws IOException {
        byte[] file = defaultWorkbook(List.of(
                row("08.220.930/0001-62", "CODEPE", "CODEPE", CITY, STATE, GASOLINA, 7.19, DATE)));

        assertEquals("08220930000162", parse(file).get(0).cnpj());
    }

    // ------------------------------------------------------------------ nome do posto

    @Test
    @DisplayName("usa a razão social quando o nome fantasia está vazio ou em branco")
    void usesLegalNameWhenTradeNameIsBlank() throws IOException {
        byte[] file = defaultWorkbook(List.of(
                row(11111111000111L, "COMERCIO DE PETROLEO ALFA LTDA", null, CITY, STATE, GASOLINA, 6.29, DATE),
                row(22222222000122L, "COMERCIO DE PETROLEO BETA LTDA", "   ", CITY, STATE, GASOLINA, 6.39, DATE),
                row(33333333000133L, "COMERCIO GAMA LTDA", "POSTO GAMA", CITY, STATE, GASOLINA, 6.49, DATE)));

        List<FuelPrice> result = parse(file);

        assertEquals("COMERCIO DE PETROLEO ALFA LTDA", result.get(0).tradeName());
        assertEquals("COMERCIO DE PETROLEO BETA LTDA", result.get(1).tradeName());
        assertEquals("POSTO GAMA", result.get(2).tradeName());
    }

    // ------------------------------------------------------------------ preço

    @Test
    @DisplayName("arredonda o preço para 2 casas (HALF_UP)")
    void roundsPriceToTwoDecimals() throws IOException {
        byte[] file = defaultWorkbook(List.of(
                validRow(GASOLINA, 6.2899999999),
                validRow(ETANOL, 6.285),
                validRow("DIESEL S10", 7)));

        List<FuelPrice> result = parse(file);

        assertEquals(new BigDecimal("6.29"), result.get(0).price());
        assertEquals(new BigDecimal("6.29"), result.get(1).price());
        assertEquals(new BigDecimal("7.00"), result.get(2).price());
    }

    @Test
    @DisplayName("aceita preço em texto com vírgula decimal")
    void acceptsPriceAsTextWithComma() throws IOException {
        byte[] file = defaultWorkbook(List.of(validRow(GASOLINA, "6,29")));

        assertEquals(new BigDecimal("6.29"), parse(file).get(0).price());
    }

    // ------------------------------------------------------------------ data

    @Test
    @DisplayName("lê a data de célula de data do Excel")
    void readsDateFromDateCell() throws IOException {
        byte[] file = defaultWorkbook(List.of(validRow(GASOLINA, 6.29)));

        assertEquals(DATE, parse(file).get(0).collectionDate());
    }

    @Test
    @DisplayName("lê a data em texto no formato dd/MM/yyyy")
    void readsDateFromBrazilianText() throws IOException {
        byte[] file = defaultWorkbook(List.of(
                row(12345678000190L, "POSTO TESTE LTDA", "POSTO TESTE", CITY, STATE, GASOLINA, 6.29, "29/09/2026")));

        assertEquals(DATE, parse(file).get(0).collectionDate());
    }

    // ------------------------------------------------------------------ linhas inválidas

    @Test
    @DisplayName("ignora linhas inválidas e mantém as válidas")
    void skipsInvalidRowsButKeepsValidOnes() throws IOException {
        byte[] file = defaultWorkbook(List.of(
                row(1L, "R", "T", CITY, STATE, GASOLINA, 0, DATE),                 // preço zero
                row(2L, "R", "T", CITY, STATE, GASOLINA, -1.5, DATE),              // preço negativo
                row(3L, "R", "T", CITY, STATE, GASOLINA, null, DATE),              // sem preço
                row(4L, "R", "T", CITY, STATE, GASOLINA, "abc", DATE),             // preço ilegível
                row(5L, "R", "T", CITY, STATE, GASOLINA, 6.29, null),              // sem data
                row(6L, "R", "T", CITY, STATE, GASOLINA, 6.29, "data inválida"),   // data ilegível
                row(null, "R", "T", CITY, STATE, GASOLINA, 6.29, DATE),            // sem CNPJ
                validRow(ETANOL, 3.99)));                                          // válida

        List<FuelPrice> result = parse(file);

        assertEquals(1, result.size());
        assertEquals(ETANOL, result.get(0).product());
    }

    @Test
    @DisplayName("ignora linhas vazias no meio dos dados")
    void ignoresEmptyRowsBetweenData() throws IOException {
        byte[] file = defaultWorkbook(Arrays.asList(
                validRow(GASOLINA, 6.29),
                null,
                validRow(ETANOL, 3.99)));

        assertEquals(2, parse(file).size());
    }

    // ------------------------------------------------------------------ estrutura da planilha

    @Test
    @DisplayName("encontra o cabeçalho independentemente de quantas linhas de metadados existam")
    void findsHeaderRegardlessOfMetadataRows() throws IOException {
        List<Map<String, Object>> rows = List.of(validRow(GASOLINA, 6.29));

        assertEquals(1, parse(workbook(SHEET, 3, HEADER, rows)).size());
        assertEquals(1, parse(workbook(SHEET, 15, HEADER, rows)).size());
    }

    @Test
    @DisplayName("lê as colunas pelo nome do cabeçalho, não pela posição")
    void readsColumnsByNameNotByPosition() throws IOException {
        // CNPJ continua na 1ª coluna (é por ela que o cabeçalho é localizado); o resto é invertido.
        List<String> reordered = new ArrayList<>(HEADER);
        reordered.remove("CNPJ");
        Collections.reverse(reordered);
        reordered.add(0, "CNPJ");

        byte[] file = workbook(SHEET, ANP_METADATA_ROWS, reordered, List.of(
                row(12345678000190L, "POSTO TESTE LTDA", "POSTO TESTE", CITY, STATE, ETANOL, 3.99, DATE)));

        List<FuelPrice> result = parse(file);

        assertEquals(1, result.size());
        FuelPrice price = result.get(0);
        assertEquals("12345678000190", price.cnpj());
        assertEquals("POSTO TESTE", price.tradeName());
        assertEquals(ETANOL, price.product());
        assertEquals(new BigDecimal("3.99"), price.price());
        assertEquals(DATE, price.collectionDate());
    }

    // ------------------------------------------------------------------ erros

    @Test
    @DisplayName("lança erro quando não há nenhuma linha válida para a cidade")
    void throwsWhenNoValidRowForCity() throws IOException {
        byte[] file = defaultWorkbook(List.of(rowFor("BELO HORIZONTE", STATE)));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () -> parse(file));

        assertTrue(error.getMessage().contains(CITY));
    }

    @Test
    @DisplayName("lança erro quando a cidade só tem produtos fora da lista (ex.: só GLP)")
    void throwsWhenCityHasOnlyIgnoredProducts() throws IOException {
        byte[] file = defaultWorkbook(List.of(validRow("GLP", 100)));

        assertThrows(IllegalArgumentException.class, () -> parse(file));
    }

    @Test
    @DisplayName("lança erro quando a aba esperada não existe")
    void throwsWhenSheetIsMissing() throws IOException {
        byte[] file = workbook("OUTRA ABA", ANP_METADATA_ROWS, HEADER, List.of(validRow(GASOLINA, 6.29)));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () -> parse(file));

        assertTrue(error.getMessage().contains(SHEET));
    }

    @Test
    @DisplayName("lança erro quando o cabeçalho (coluna CNPJ) não é encontrado")
    void throwsWhenHeaderIsNotFound() throws IOException {
        byte[] file = workbook(SHEET, ANP_METADATA_ROWS, List.of("DOCUMENTO", "PRODUTO"), List.of());

        IllegalStateException error = assertThrows(IllegalStateException.class, () -> parse(file));

        assertTrue(error.getMessage().contains("CNPJ"));
    }

    @Test
    @DisplayName("lança erro quando falta uma coluna obrigatória")
    void throwsWhenRequiredColumnIsMissing() throws IOException {
        List<String> withoutProduct = new ArrayList<>(HEADER);
        withoutProduct.remove("PRODUTO");
        byte[] file = workbook(SHEET, ANP_METADATA_ROWS, withoutProduct, List.of(validRow(GASOLINA, 6.29)));

        IllegalStateException error = assertThrows(IllegalStateException.class, () -> parse(file));

        assertTrue(error.getMessage().contains("PRODUTO"));
    }

    // ------------------------------------------------------------------ helpers: leitura

    private List<FuelPrice> parse(byte[] file) {
        return parser.processingAnpData(new ByteArrayInputStream(file), CITY, STATE);
    }

    // ------------------------------------------------------------------ helpers: montagem de linhas

    /** Linha completa. Valores aceitos: String, Number, LocalDate ou null (célula vazia). */
    private static Map<String, Object> row(Object cnpj, String legalName, String tradeName,
            String city, String state, String product, Object price, Object date) {
        Map<String, Object> values = new HashMap<>();
        values.put("CNPJ", cnpj);
        values.put("RAZÃO", legalName);
        values.put("FANTASIA", tradeName);
        values.put("ENDEREÇO", "RUA TESTE");
        values.put("NÚMERO", 100);
        values.put("BAIRRO", "CENTRO");
        values.put("CEP", 35660000);
        values.put("MUNICÍPIO", city);
        values.put("ESTADO", state);
        values.put("BANDEIRA", "BRANCA");
        values.put("PRODUTO", product);
        values.put("UNIDADE DE MEDIDA", "R$ / litro");
        values.put("PREÇO DE REVENDA", price);
        values.put("DATA DA COLETA", date);
        return values;
    }

    /** Linha válida da cidade-alvo, para o produto e preço informados. */
    private static Map<String, Object> validRow(String product, Object price) {
        return row(12345678000190L, "POSTO TESTE LTDA", "POSTO TESTE", CITY, STATE, product, price, DATE);
    }

    /** Linha válida de gasolina em uma cidade/estado qualquer. */
    private static Map<String, Object> rowFor(String city, String state) {
        return row(12345678000190L, "POSTO TESTE LTDA", "POSTO TESTE", city, state, GASOLINA, 6.29, DATE);
    }

    // ------------------------------------------------------------------ helpers: montagem do .xlsx

    private static byte[] defaultWorkbook(List<Map<String, Object>> rows) throws IOException {
        return workbook(SHEET, ANP_METADATA_ROWS, HEADER, rows);
    }

    /**
     * Gera um .xlsx em memória. {@code null} em {@code rows} deixa uma linha totalmente vazia
     * (a planilha fica com "buraco", como acontece com linhas em branco no Excel).
     */
    private static byte[] workbook(String sheetName, int metadataRows, List<String> header,
            List<Map<String, Object>> rows) throws IOException {

        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(sheetName);

            CellStyle dateStyle = workbook.createCellStyle();
            dateStyle.setDataFormat(workbook.getCreationHelper().createDataFormat().getFormat("dd/mm/yyyy"));

            for (int i = 0; i < metadataRows; i++) {
                sheet.createRow(i).createCell(0).setCellValue("METADADO " + i);
            }

            Row headerRow = sheet.createRow(metadataRows);
            for (int c = 0; c < header.size(); c++) {
                headerRow.createCell(c).setCellValue(header.get(c));
            }

            int rowIndex = metadataRows + 1;
            for (Map<String, Object> values : rows) {
                if (values == null) {
                    rowIndex++;
                    continue;
                }
                Row row = sheet.createRow(rowIndex++);
                for (int c = 0; c < header.size(); c++) {
                    Object value = values.get(header.get(c));
                    if (value == null) {
                        continue;
                    }
                    Cell cell = row.createCell(c);
                    if (value instanceof String text) {
                        cell.setCellValue(text);
                    } else if (value instanceof LocalDate date) {
                        cell.setCellValue(Date.from(date.atStartOfDay(ZoneId.systemDefault()).toInstant()));
                        cell.setCellStyle(dateStyle);
                    } else if (value instanceof Number number) {
                        cell.setCellValue(number.doubleValue());
                    } else {
                        throw new IllegalArgumentException("Tipo de valor não suportado: " + value.getClass());
                    }
                }
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }
}