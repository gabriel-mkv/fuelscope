package com.gabrielmkv.scheduler;

import java.io.InputStream;
import java.net.URI;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;

import com.gabrielmkv.service.AnpParserService;

import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped 
public class AnpSchedulerService {
    
    @Inject 
    AnpParserService anpParserService;

    // Runs every Monday at 7 AM
    @Scheduled(cron = "0 0 7 ? * MON") 
    public void scheduleAnpProcessing() {
        System.out.println("Iniciando o processamento do arquivo ANP  semanal...");
        String anpUrl = generateLastWeekUrl();

        try (InputStream excelInputStream = URI.create(anpUrl).toURL().openStream()) {
            anpParserService.processing(excelInputStream);
            System.out.println("Processamento do arquivo ANP concluído com sucesso!");
        } catch (Exception e) {
            System.err.println("Erro ao processar o arquivo ANP: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public String generateLastWeekUrl() {
        LocalDate today = LocalDate.now();

        LocalDate endSaturday = today.with(
            TemporalAdjusters.previousOrSame(DayOfWeek.SATURDAY)
        );

        LocalDate startSunday = endSaturday.minusDays(6);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        int year = startSunday.getYear();
        String startDate = startSunday.format(formatter);
        String endDate = endSaturday.format(formatter);

        return String.format(
            "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc/%d/revendas_lpc_%s_%s.xlsx",
            year, startDate, endDate
        );
    }
}
