package com.gabrielmkv.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.gabrielmkv.model.FuelPrice;

/**
 * Testes unitários puros (não sobem o Quarkus): o serviço é instanciado na mão,
 * com um diretório temporário e um relógio fixo.
 */
class FuelDataServiceTest {

    // "Hoje" fixo, para o teste não depender do dia em que roda. A janela começa em 2025-10-15.
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 15);
    private static final LocalDate WINDOW_START = TODAY.minusMonths(12);
    private static final Clock FIXED_CLOCK =
            Clock.fixed(TODAY.atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);

    private static final String HISTORY_FILE = "fuel-history.json";
    private static final String CURRENT_FILE = "fuel-prices.json";

    private static final String CNPJ_A = "11111111000111";
    private static final String CNPJ_B = "22222222000122";
    private static final String CNPJ_C = "33333333000133";
    private static final String GASOLINA = "GASOLINA COMUM";
    private static final String ETANOL = "ETANOL";

    @TempDir
    Path tempDir;

    private Path dataDir;
    private ObjectMapper mapper;
    private FuelDataService service;

    @BeforeEach
    void setUp() {
        mapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // Diretório ainda inexistente, para também testar a criação da pasta.
        dataDir = tempDir.resolve("data");

        service = new FuelDataService();
        service.objectMapper = mapper;
        service.dataDirectory = dataDir;
        service.clock = FIXED_CLOCK;
    }

    // ------------------------------------------------------------------ criação dos arquivos

    @Test
    @DisplayName("cria a pasta data/ e os dois arquivos JSON na primeira execução")
    void createsDirectoryAndFilesOnFirstRun() throws IOException {
        service.updateFiles(List.of(
                fuel(CNPJ_A, "POSTO A", GASOLINA, "6.29", TODAY.minusDays(2)),
                fuel(CNPJ_A, "POSTO A", ETANOL, "3.99", TODAY.minusDays(2))));

        assertTrue(Files.isRegularFile(dataDir.resolve(HISTORY_FILE)));
        assertTrue(Files.isRegularFile(dataDir.resolve(CURRENT_FILE)));
        assertEquals(2, readJson(HISTORY_FILE).size());
        assertEquals(2, readJson(CURRENT_FILE).size());
    }

    @Test
    @DisplayName("não deixa arquivos .tmp para trás")
    void doesNotLeaveTemporaryFiles() throws IOException {
        service.updateFiles(List.of(fuel(CNPJ_A, "POSTO A", GASOLINA, "6.29", TODAY.minusDays(2))));

        try (Stream<Path> files = Files.list(dataDir)) {
            List<String> names = files.map(p -> p.getFileName().toString()).sorted().toList();
            assertEquals(List.of(HISTORY_FILE, CURRENT_FILE), names);
        }
    }

    // ------------------------------------------------------------------ janela do histórico

    @Test
    @DisplayName("mantém os registros recentes (regressão do filtro de datas invertido)")
    void keepsRecentRecords() throws IOException {
        service.updateFiles(List.of(fuel(CNPJ_A, "POSTO A", GASOLINA, "6.29", TODAY.minusDays(16))));

        List<FuelPrice> history = readJson(HISTORY_FILE);
        assertEquals(1, history.size());
        assertEquals(TODAY.minusDays(16), history.get(0).collectionDate());
    }

    @Test
    @DisplayName("descarta registros mais antigos que a janela e mantém o limite exato")
    void discardsRecordsOlderThanWindow() throws IOException {
        service.updateFiles(List.of(
                fuel(CNPJ_A, "POSTO A", GASOLINA, "5.00", WINDOW_START.minusDays(1)), // fora
                fuel(CNPJ_B, "POSTO B", GASOLINA, "5.50", WINDOW_START),              // no limite: fica
                fuel(CNPJ_C, "POSTO C", GASOLINA, "6.29", TODAY.minusDays(2))));      // recente

        Set<String> cnpjs = readJson(HISTORY_FILE).stream()
                .map(FuelPrice::cnpj)
                .collect(Collectors.toSet());

        assertEquals(Set.of(CNPJ_B, CNPJ_C), cnpjs);
    }

    @Test
    @DisplayName("remove do histórico existente o que saiu da janela em execuções futuras")
    void dropsExpiredRecordsFromExistingHistory() throws IOException {
        // Hoje, 2025-10-20 está dentro da janela e é gravado.
        service.updateFiles(List.of(fuel(CNPJ_A, "POSTO A", GASOLINA, "5.00", LocalDate.of(2025, 10, 20))));
        assertEquals(1, readJson(HISTORY_FILE).size());

        // Um ano depois, a mesma janela já não alcança aquele registro.
        service.clock = Clock.fixed(
                LocalDate.of(2026, 12, 1).atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);
        service.updateFiles(List.of(fuel(CNPJ_B, "POSTO B", GASOLINA, "6.29", LocalDate.of(2026, 11, 28))));

        List<FuelPrice> history = readJson(HISTORY_FILE);
        assertEquals(1, history.size());
        assertEquals(CNPJ_B, history.get(0).cnpj());
    }

    // ------------------------------------------------------------------ merge e idempotência

    @Test
    @DisplayName("rodar duas vezes com os mesmos dados não duplica nem altera os arquivos")
    void isIdempotent() throws IOException {
        List<FuelPrice> week = List.of(
                fuel(CNPJ_A, "POSTO A", GASOLINA, "6.29", TODAY.minusDays(3)),
                fuel(CNPJ_B, "POSTO B", ETANOL, "3.99", TODAY.minusDays(4)));

        service.updateFiles(week);
        String historyAfterFirst = Files.readString(dataDir.resolve(HISTORY_FILE));
        String currentAfterFirst = Files.readString(dataDir.resolve(CURRENT_FILE));

        service.updateFiles(week);

        assertEquals(historyAfterFirst, Files.readString(dataDir.resolve(HISTORY_FILE)));
        assertEquals(currentAfterFirst, Files.readString(dataDir.resolve(CURRENT_FILE)));
        assertEquals(2, readJson(HISTORY_FILE).size());
    }

    @Test
    @DisplayName("registro novo com a mesma chave (cnpj, produto, data) sobrescreve o antigo")
    void newRecordOverridesSameKey() throws IOException {
        LocalDate date = TODAY.minusDays(3);

        service.updateFiles(List.of(fuel(CNPJ_A, "POSTO A", GASOLINA, "6.29", date)));
        service.updateFiles(List.of(fuel(CNPJ_A, "POSTO A", GASOLINA, "6.39", date)));

        List<FuelPrice> history = readJson(HISTORY_FILE);
        assertEquals(1, history.size());
        assertPrice("6.39", history.get(0));
    }

    @Test
    @DisplayName("junta a semana nova ao histórico já existente")
    void mergesNewWeekWithExistingHistory() throws IOException {
        service.updateFiles(List.of(fuel(CNPJ_A, "POSTO A", GASOLINA, "6.29", TODAY.minusDays(10))));
        service.updateFiles(List.of(fuel(CNPJ_A, "POSTO A", GASOLINA, "6.35", TODAY.minusDays(3))));

        List<FuelPrice> history = readJson(HISTORY_FILE);
        assertEquals(2, history.size());
        assertPrice("6.29", history.get(0));
        assertPrice("6.35", history.get(1));
    }

    @Test
    @DisplayName("histórico sai ordenado por data, depois CNPJ, depois produto")
    void historyIsSortedByDateThenCnpjThenProduct() throws IOException {
        LocalDate d1 = TODAY.minusDays(7);
        LocalDate d2 = TODAY.minusDays(1);

        // Propositalmente fora de ordem.
        service.updateFiles(List.of(
                fuel(CNPJ_B, "POSTO B", GASOLINA, "6.30", d2),
                fuel(CNPJ_A, "POSTO A", ETANOL, "3.90", d1),
                fuel(CNPJ_A, "POSTO A", GASOLINA, "6.20", d1),
                fuel(CNPJ_B, "POSTO B", ETANOL, "3.95", d1)));

        List<String> order = readJson(HISTORY_FILE).stream()
                .map(p -> p.collectionDate() + "|" + p.cnpj() + "|" + p.product())
                .toList();

        assertEquals(List.of(
                d1 + "|" + CNPJ_A + "|" + ETANOL,
                d1 + "|" + CNPJ_A + "|" + GASOLINA,
                d1 + "|" + CNPJ_B + "|" + ETANOL,
                d2 + "|" + CNPJ_B + "|" + GASOLINA), order);
    }

    // ------------------------------------------------------------------ preços atuais

    @Test
    @DisplayName("preço atual é o mais recente de cada posto e produto")
    void currentKeepsLatestPricePerStationAndProduct() throws IOException {
        service.updateFiles(List.of(
                fuel(CNPJ_A, "POSTO A", GASOLINA, "6.29", TODAY.minusDays(10)),
                fuel(CNPJ_A, "POSTO A", GASOLINA, "6.39", TODAY.minusDays(3)),
                fuel(CNPJ_A, "POSTO A", ETANOL, "3.99", TODAY.minusDays(3))));

        List<FuelPrice> current = readJson(CURRENT_FILE);
        assertEquals(2, current.size());

        FuelPrice gasolina = current.stream()
                .filter(p -> GASOLINA.equals(p.product()))
                .findFirst()
                .orElseThrow();
        assertPrice("6.39", gasolina);
        assertEquals(3, readJson(HISTORY_FILE).size());
    }

    @Test
    @DisplayName("preço atual ignora postos sem coleta nos últimos 14 dias (e o histórico mantém)")
    void currentIgnoresStationsNotCollectedRecently() throws IOException {
        LocalDate latest = TODAY.minusDays(10);

        service.updateFiles(List.of(
                fuel(CNPJ_A, "POSTO A", GASOLINA, "6.29", latest),
                fuel(CNPJ_B, "POSTO B", GASOLINA, "6.31", latest.minusDays(14)), // limite: entra
                fuel(CNPJ_C, "POSTO C", GASOLINA, "6.35", latest.minusDays(15)))); // fora

        Set<String> currentCnpjs = readJson(CURRENT_FILE).stream()
                .map(FuelPrice::cnpj)
                .collect(Collectors.toSet());

        assertEquals(Set.of(CNPJ_A, CNPJ_B), currentCnpjs);
        assertEquals(3, readJson(HISTORY_FILE).size());
    }

    @Test
    @DisplayName("preços atuais saem ordenados pelo nome do posto, sem diferenciar maiúsculas")
    void currentIsSortedByTradeNameIgnoringCase() throws IOException {
        LocalDate date = TODAY.minusDays(2);

        service.updateFiles(List.of(
                fuel(CNPJ_A, "Bom Preço", GASOLINA, "6.29", date),
                fuel(CNPJ_B, "auto zebra", GASOLINA, "6.31", date)));

        List<String> names = readJson(CURRENT_FILE).stream().map(FuelPrice::tradeName).toList();

        // Com compareTo simples, "Bom Preço" (B maiúsculo) viria antes de "auto zebra".
        assertEquals(List.of("auto zebra", "Bom Preço"), names);
    }

    // ------------------------------------------------------------------ validação

    @Test
    @DisplayName("lista nula ou vazia é rejeitada sem criar nada em disco")
    void rejectsNullOrEmptyInput() {
        assertThrows(IllegalArgumentException.class, () -> service.updateFiles(null));
        assertThrows(IllegalArgumentException.class, () -> service.updateFiles(List.of()));
        assertFalse(Files.exists(dataDir));
    }

    @Test
    @DisplayName("descarta registros inválidos e grava os válidos")
    void discardsInvalidRecordsButKeepsValidOnes() throws IOException {
        LocalDate date = TODAY.minusDays(2);

        service.updateFiles(Arrays.asList(
                null,
                fuel("  ", "SEM CNPJ", GASOLINA, "6.29", date),
                fuel(CNPJ_A, "SEM PRODUTO", null, "6.29", date),
                fuel(CNPJ_A, "PRODUTO EM BRANCO", "  ", "6.29", date),
                fuel(CNPJ_A, "SEM DATA", GASOLINA, "6.29", null),
                fuel(CNPJ_A, "SEM PRECO", GASOLINA, null, date),
                fuel(CNPJ_A, "PRECO ZERO", GASOLINA, "0", date),
                fuel(CNPJ_A, "PRECO NEGATIVO", GASOLINA, "-1.00", date),
                fuel(CNPJ_B, "POSTO VALIDO", GASOLINA, "6.29", date)));

        List<FuelPrice> history = readJson(HISTORY_FILE);
        assertEquals(1, history.size());
        assertEquals(CNPJ_B, history.get(0).cnpj());
    }

    @Test
    @DisplayName("se nenhum registro for válido, lança erro e preserva os arquivos existentes")
    void failsAndPreservesFilesWhenNoRecordIsValid() throws IOException {
        service.updateFiles(List.of(fuel(CNPJ_A, "POSTO A", GASOLINA, "6.29", TODAY.minusDays(2))));
        String historyBefore = Files.readString(dataDir.resolve(HISTORY_FILE));
        String currentBefore = Files.readString(dataDir.resolve(CURRENT_FILE));

        assertThrows(IllegalArgumentException.class, () -> service.updateFiles(List.of(
                fuel(CNPJ_B, "PRECO ZERO", GASOLINA, "0", TODAY.minusDays(2)),
                fuel("", "SEM CNPJ", GASOLINA, "6.29", TODAY.minusDays(2)))));

        assertEquals(historyBefore, Files.readString(dataDir.resolve(HISTORY_FILE)));
        assertEquals(currentBefore, Files.readString(dataDir.resolve(CURRENT_FILE)));
    }

    // ------------------------------------------------------------------ arquivo de histórico problemático

    @Test
    @DisplayName("histórico vazio (0 bytes) é tratado como sem histórico")
    void treatsEmptyHistoryFileAsNoHistory() throws IOException {
        Files.createDirectories(dataDir);
        Files.writeString(dataDir.resolve(HISTORY_FILE), "");

        service.updateFiles(List.of(fuel(CNPJ_A, "POSTO A", GASOLINA, "6.29", TODAY.minusDays(2))));

        assertEquals(1, readJson(HISTORY_FILE).size());
    }

    @Test
    @DisplayName("histórico corrompido gera erro e não é sobrescrito")
    void failsOnCorruptHistoryWithoutOverwritingIt() throws IOException {
        Files.createDirectories(dataDir);
        Path history = dataDir.resolve(HISTORY_FILE);
        Files.writeString(history, "isto não é um JSON");

        assertThrows(IllegalStateException.class, () -> service.updateFiles(
                List.of(fuel(CNPJ_A, "POSTO A", GASOLINA, "6.29", TODAY.minusDays(2)))));

        assertEquals("isto não é um JSON", Files.readString(history));
        assertFalse(Files.exists(dataDir.resolve(CURRENT_FILE)));
    }

    // ------------------------------------------------------------------ helpers

    private static FuelPrice fuel(String cnpj, String tradeName, String product, String price, LocalDate date) {
        return new FuelPrice(
                cnpj,
                "RAZAO " + tradeName,
                tradeName,
                "RUA TESTE, 100",
                "CENTRO",
                "BRANCA",
                product,
                price == null ? null : new BigDecimal(price),
                date);
    }

    private List<FuelPrice> readJson(String fileName) throws IOException {
        return mapper.readValue(dataDir.resolve(fileName).toFile(), new TypeReference<List<FuelPrice>>() {});
    }

    /** Compara por valor (compareTo), sem depender da escala do BigDecimal (6.3 vs 6.30). */
    private static void assertPrice(String expected, FuelPrice actual) {
        assertEquals(0, new BigDecimal(expected).compareTo(actual.price()),
                "esperado " + expected + " mas foi " + actual.price());
    }
}