package com.gabrielmkv.service;

import java.io.ByteArrayInputStream;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import com.gabrielmkv.model.FuelPrice;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * Fluxo completo de uma atualização: baixa as últimas semanas, lê, mescla e grava os JSON.
 *
 * Verifica várias semanas (e não só a última) porque a ANP às vezes publica na segunda ou na
 * terça, e porque reenvia arquivos corrigidos depois ("Atualizado em ..." na página dela).
 * Como o merge é idempotente, reprocessar semanas já gravadas é seguro.
 */
@ApplicationScoped
public class AnpUpdateService {

    private static final Logger LOG = Logger.getLogger(AnpUpdateService.class);

    @Inject
    AnpDownloadService downloadService;

    @Inject
    AnpParserService parserService;

    @Inject
    FuelDataService fuelDataService;

    @ConfigProperty(name = "fuelscope.anp-municipality")
    String municipality;

    @ConfigProperty(name = "fuelscope.anp-state")
    String state;

    @ConfigProperty(name = "fuelscope.anp-weeks-to-check")
    int weeksToCheck;

    // Fuso do Brasil: o runner do GitHub roda em UTC e "hoje" pode divergir de madrugada.
    Clock clock = Clock.system(ZoneId.of("America/Sao_Paulo"));

    public void run() {
        List<FuelPrice> prices = new ArrayList<>();
        int weeksWithData = 0;

        for (LocalDate weekEnd : AnpDownloadService.recentWeekEnds(LocalDate.now(clock), weeksToCheck)) {
            Optional<byte[]> file = downloadService.download(weekEnd);
            if (file.isEmpty()) {
                continue;
            }

            try {
                prices.addAll(parserService.processingAnpData(
                        new ByteArrayInputStream(file.get()), municipality, state));
                weeksWithData++;
            } catch (IllegalArgumentException e) {
                // Ex.: a ANP não pesquisou a cidade naquela semana. Não deve barrar as outras semanas.
                LOG.warnf("Semana encerrada em %s ignorada: %s", weekEnd, e.getMessage());
            }
        }

        if (prices.isEmpty()) {
            throw new IllegalStateException(
                    "Nenhuma planilha com dados de %s - %s nas últimas %d semanas."
                            .formatted(municipality, state, weeksToCheck));
        }

        fuelDataService.updateFiles(prices);
        LOG.infof("Coleta da ANP concluída: %d registros de %d semana(s).", prices.size(), weeksWithData);
    }
}