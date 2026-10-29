package com.gabrielmkv.service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

import org.jboss.logging.Logger;

import jakarta.enterprise.context.ApplicationScoped;

/**
 * Monta as URLs semanais da ANP e baixa as planilhas.
 *
 * A semana da ANP vai de domingo a sábado. O arquivo fica em
 * {@code arquivos-lpc/<ANO DO SÁBADO>/revendas_lpc_<domingo>_<sábado>.xlsx}.
 * Atenção: a pasta usa o ano do dia FINAL da semana. A semana de 28/12/2025 a 03/01/2026,
 * por exemplo, está em .../2026/revendas_lpc_2025-12-28_2026-01-03.xlsx.
 */
@ApplicationScoped
public class AnpDownloadService {

    private static final Logger LOG = Logger.getLogger(AnpDownloadService.class);

    private static final String DEFAULT_BASE_URL =
            "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc";

    private static final String USER_AGENT = "Mozilla/5.0 (compatible; fuel-scope)";

    /** Package-private para que os testes apontem para um servidor local. */
    String baseUrl = DEFAULT_BASE_URL;

    private HttpClient httpClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(20))
            .build();

    /**
     * Resultado de uma tentativa de download.
     *
     * Distingue HTTP 404 de uma resposta inválida, permitindo tentar
     * outro padrão de URL somente quando o arquivo não for encontrado.
     */
    private record DownloadAttempt(
            boolean notFound,
            Optional<byte[]> content) {
    }

    /**
     * Sábados finais das semanas a verificar, da mais recente para a mais antiga.
     * Inclui a semana corrente: a ANP costuma publicá-la na sexta, antes de ela terminar.
     */
    static List<LocalDate> recentWeekEnds(LocalDate today, int count) {
        if (count < 1) {
            throw new IllegalArgumentException("A quantidade de semanas deve ser pelo menos 1.");
        }
        LocalDate firstEnd = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SATURDAY));
        return IntStream.range(0, count).mapToObj(firstEnd::minusWeeks).toList();
    }

    /**
     * Monta a URL no padrão antigo, com hífens dentro das datas.
     *
     * Exemplo:
     * revendas_lpc_2026-10-18_2026-10-24.xlsx
     */
    String urlFor(LocalDate weekEnd) {
        LocalDate weekStart = weekEnd.minusDays(6);
        return "%s/%d/revendas_lpc_%s_%s.xlsx".formatted(baseUrl, weekEnd.getYear(), weekStart, weekEnd);
    }

    /**
     * Monta a URL no padrão alternativo, com sublinhados dentro das datas.
     *
     * Exemplo:
     * revendas_lpc_2026_10_18-2026_10_24.xlsx
     */
    String urlForAlternative(LocalDate weekEnd) {
        LocalDate weekStart = weekEnd.minusDays(6);
        return "%s/%d/revendas_lpc_%s-%s.xlsx".formatted(baseUrl, weekEnd.getYear(), weekStart.toString().replace("-", "_"), weekEnd.toString().replace("-", "_"));
    }

    /**
     * Baixa a planilha da semana informada.
     *
     * Primeiro tenta a URL antiga. Se receber HTTP 404, tenta o padrão
     * alternativo. Outros erros não provocam uma segunda tentativa.
     *
     * @return os bytes do XLSX ou vazio se nenhum padrão encontrar
     *         uma planilha válida
     */
    Optional<byte[]> download(LocalDate weekEnd) {
        validateWeekEnd(weekEnd);

        String primaryUrl = urlFor(weekEnd);
        DownloadAttempt primaryAttempt = downloadFromUrl(primaryUrl);

        if (!primaryAttempt.notFound) {
            return primaryAttempt.content;
        }

        String alternativeUrl = urlForAlternative(weekEnd);

        LOG.infof("URL não encontrada. Tentando padrão alternativo: %s", alternativeUrl);

        DownloadAttempt alternativeAttempt = downloadFromUrl(alternativeUrl);

        return alternativeAttempt.content;
    }

    /**
     * Executa uma tentativa de download para uma URL específica.
     */
    private DownloadAttempt downloadFromUrl(String url) {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(90))
                .header("User-Agent", USER_AGENT)
                .GET()
                .build();

        try {
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            int status = response.statusCode();

            if (status == 404) {
                LOG.infof("Planilha não encontrada: %s", url);
                return new DownloadAttempt(true, Optional.empty());
            }
            
            if (status != 200) {
                throw new IllegalStateException("HTTP " + status + " ao baixar " + url);
            }

            if (!looksLikeXlsx(response.body())) {
                // O portal pode responder 200 com uma página HTML no lugar do arquivo.
                LOG.warnf("A resposta de %s não é um .xlsx; ignorando.", url);
                return new DownloadAttempt(false, Optional.empty());
            }

            LOG.infof("Planilha baixada (%d bytes): %s", response.body().length, url);
            return new DownloadAttempt(false, Optional.of(response.body()));

        } catch (IOException e) {
            throw new IllegalStateException("Erro de rede ao baixar " + url, e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Download interrompido: " + url, e);
        }
    }

    /** Um .xlsx é um zip e começa com os bytes "PK". */
    private static boolean looksLikeXlsx(byte[] body) {
        return body != null && body.length > 4 && body[0] == 'P' && body[1] == 'K';
    }

    private void validateWeekEnd(LocalDate weekEnd) {
        if (weekEnd.getDayOfWeek() != DayOfWeek.SATURDAY) {
            throw new IllegalArgumentException("A semana da ANP termina no sábado, mas recebi " + weekEnd + ".");
        }
    }
}