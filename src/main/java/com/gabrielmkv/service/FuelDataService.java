package com.gabrielmkv.service;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.jboss.logging.Logger;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gabrielmkv.model.FuelPrice;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class FuelDataService {

    private static final Logger LOG = Logger.getLogger(FuelDataService.class);

    private static final String HISTORY_FILE_NAME = "fuel-history.json";
    private static final String CURRENT_FILE_NAME = "fuel-prices.json";

    /** Janela do histórico, em meses. */
    private static final int HISTORY_MONTHS = 12;

    /**
     * "Preço atual" só considera coletas até 14 dias antes da coleta mais recente.
     * Evita mostrar como atual um posto que parou de ser pesquisado há meses.
     */
    private static final int CURRENT_WINDOW_DAYS = 14;

    /** Ordena postos por nome fantasia (que pode ser nulo na planilha da ANP), depois CNPJ e produto. */
    private static final Comparator<FuelPrice> BY_STATION = Comparator
            .comparing(FuelPrice::tradeName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
            .thenComparing(FuelPrice::cnpj)
            .thenComparing(FuelPrice::product);

    private static final Comparator<FuelPrice> BY_DATE = Comparator
            .comparing(FuelPrice::collectionDate)
            .thenComparing(FuelPrice::cnpj)
            .thenComparing(FuelPrice::product);

    @Inject
    ObjectMapper objectMapper;

    // Sem "private" de propósito: os testes trocam o diretório e o relógio.
    Path dataDirectory = Path.of("data");
    Clock clock = Clock.systemDefaultZone();

    public void updateFiles(List<FuelPrice> newPrices) {
        if (newPrices == null || newPrices.isEmpty()) {
            throw new IllegalArgumentException(
                "A lista de novos preços está vazia. Os arquivos não serão alterados.");
        }

        // Registros inválidos são descartados com aviso, em vez de derrubar a execução inteira.
        List<FuelPrice> validNewPrices = newPrices.stream()
                .filter(this::isValid)
                .toList();

        int discarded = newPrices.size() - validNewPrices.size();
        if (discarded > 0) {
            LOG.warnf("%d registros inválidos foram descartados.", discarded);
        }
        if (validNewPrices.isEmpty()) {
            throw new IllegalArgumentException(
                "Nenhum registro válido encontrado. Os arquivos não serão alterados.");
        }

        try {
            Files.createDirectories(dataDirectory);

            Map<HistoryKey, FuelPrice> merged = new LinkedHashMap<>();
            for (FuelPrice price : readHistory()) {
                merged.put(keyOf(price), price);
            }
            // Novos registros sobrescrevem os antigos com a mesma chave (idempotência/correções).
            for (FuelPrice price : validNewPrices) {
                merged.put(keyOf(price), price);
            }

            LocalDate cutoffDate = LocalDate.now(clock).minusMonths(HISTORY_MONTHS);

            // CORREÇÃO: antes era isBefore(cutoff), que mantinha só os registros ANTIGOS.
            List<FuelPrice> history = merged.values().stream()
                    .filter(price -> !price.collectionDate().isBefore(cutoffDate))
                    .sorted(BY_DATE)
                    .toList();

            List<FuelPrice> current = buildCurrent(history);

            Path historyTemp = writeTemporaryFile(historyFile(), history);
            Path currentTemp = null;
            try {
                currentTemp = writeTemporaryFile(currentFile(), current);
                replaceFile(historyTemp, historyFile());
                replaceFile(currentTemp, currentFile());
            } finally {
                // Após o move bem-sucedido, o temporário já não existe; deleteIfExists é inofensivo.
                Files.deleteIfExists(historyTemp);
                if (currentTemp != null) {
                    Files.deleteIfExists(currentTemp);
                }
            }

            LOG.infof("Dados atualizados: %d registros no histórico e %d preços atuais.",
                    history.size(), current.size());

        } catch (IOException e) {
            throw new IllegalStateException("Não foi possível atualizar os arquivos de preços.", e);
        }
    }

    /** Último preço de cada posto/produto, ignorando postos sem coleta recente. */
    private List<FuelPrice> buildCurrent(List<FuelPrice> history) {
        if (history.isEmpty()) {
            return List.of();
        }

        // history já está ordenado por data crescente: o último elemento é a coleta mais recente.
        LocalDate latestDate = history.get(history.size() - 1).collectionDate();
        LocalDate windowStart = latestDate.minusDays(CURRENT_WINDOW_DAYS);

        Map<CurrentKey, FuelPrice> latestPrices = new LinkedHashMap<>();
        for (FuelPrice price : history) {
            if (price.collectionDate().isBefore(windowStart)) {
                continue;
            }
            // Ordem crescente por data: o último a entrar para a chave é o mais recente.
            latestPrices.put(new CurrentKey(price.cnpj(), price.product()), price);
        }

        return latestPrices.values().stream().sorted(BY_STATION).toList();
    }

    private List<FuelPrice> readHistory() throws IOException {
        if (!Files.exists(historyFile()) || Files.size(historyFile()) == 0) {
            return new ArrayList<>();
        }
        return objectMapper.readValue(historyFile().toFile(), new TypeReference<List<FuelPrice>>() {});
    }

    private Path writeTemporaryFile(Path destination, List<FuelPrice> prices) throws IOException {
        Path temporary = Files.createTempFile(dataDirectory, destination.getFileName().toString(), ".tmp");
        try {
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(temporary.toFile(), prices);
            return temporary;
        } catch (IOException e) {
            Files.deleteIfExists(temporary);
            throw e;
        }
    }

    private void replaceFile(Path source, Path destination) throws IOException {
        try {
            Files.move(source, destination,
                    StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException e) {
            Files.move(source, destination, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private Path historyFile() {
        return dataDirectory.resolve(HISTORY_FILE_NAME);
    }

    private Path currentFile() {
        return dataDirectory.resolve(CURRENT_FILE_NAME);
    }

    private HistoryKey keyOf(FuelPrice price) {
        return new HistoryKey(price.cnpj(), price.product(), price.collectionDate());
    }

    private boolean isValid(FuelPrice price) {
        return price != null
                && price.cnpj() != null && !price.cnpj().isBlank()
                && price.product() != null && !price.product().isBlank()
                && price.collectionDate() != null
                && price.price() != null && price.price().compareTo(BigDecimal.ZERO) > 0;
    }

    private record HistoryKey(String cnpj, String product, LocalDate collectionDate) {}

    private record CurrentKey(String cnpj, String product) {}
}