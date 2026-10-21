package com.gabrielmkv.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.sun.net.httpserver.HttpServer;

/**
 * Testes unitários puros. O download é exercitado contra um servidor HTTP local (do próprio JDK),
 * então nenhum teste acessa o site da ANP.
 */
class AnpDownloadServiceTest {

    private static final String BASE_PATH = "/arquivos-lpc";

    /** Bytes iniciais de um .xlsx de verdade: um zip ("PK\3\4"). */
    private static final byte[] XLSX_BYTES = {'P', 'K', 3, 4, 10, 20, 30, 40};

    private HttpServer server;
    private AnpDownloadService service;
    private final AtomicReference<String> receivedUserAgent = new AtomicReference<>();

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        server.start();

        service = new AnpDownloadService();
        service.baseUrl = "http://127.0.0.1:" + server.getAddress().getPort() + BASE_PATH;
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    // ------------------------------------------------------------------ montagem da URL

    @Test
    @DisplayName("monta a URL no padrão da ANP (domingo a sábado)")
    void buildsUrlInAnpPattern() {
        String url = service.urlFor(LocalDate.of(2026, 10, 10));

        assertEquals(service.baseUrl + "/2026/revendas_lpc_2026-10-04_2026-10-10.xlsx", url);
    }

    @Test
    @DisplayName("a pasta do ano é o ano do sábado final, não o do domingo inicial")
    void usesEndDateYearForFolder() {
        // Semana 28/12/2025 a 03/01/2026: a ANP guarda em .../2026/ com o nome começando em 2025.
        assertEquals(service.baseUrl + "/2026/revendas_lpc_2025-12-28_2026-01-03.xlsx",
                service.urlFor(LocalDate.of(2026, 1, 3)));

        // Mesmo caso na virada anterior: 29/12/2024 a 04/01/2025.
        assertEquals(service.baseUrl + "/2025/revendas_lpc_2024-12-29_2025-01-04.xlsx",
                service.urlFor(LocalDate.of(2025, 1, 4)));
    }

    @Test
    @DisplayName("rejeita datas finais que não são sábado")
    void rejectsNonSaturday() {
        assertThrows(IllegalArgumentException.class, () -> service.urlFor(LocalDate.of(2026, 10, 9)));
    }

    // ------------------------------------------------------------------ semanas a verificar

    @Test
    @DisplayName("numa segunda-feira, inclui a semana corrente e as anteriores, da mais nova à mais antiga")
    void recentWeekEndsFromMonday() {
        List<LocalDate> weeks = AnpDownloadService.recentWeekEnds(LocalDate.of(2026, 10, 19), 4);

        assertEquals(List.of(
                LocalDate.of(2026, 10, 24),
                LocalDate.of(2026, 10, 17),
                LocalDate.of(2026, 10, 10),
                LocalDate.of(2026, 10, 3)), weeks);
    }

    @Test
    @DisplayName("num sábado, a própria data é o fim da primeira semana")
    void recentWeekEndsFromSaturday() {
        List<LocalDate> weeks = AnpDownloadService.recentWeekEnds(LocalDate.of(2026, 10, 17), 2);

        assertEquals(List.of(LocalDate.of(2026, 10, 17), LocalDate.of(2026, 10, 10)), weeks);
    }

    @Test
    @DisplayName("num domingo, a semana corrente é a que termina no sábado seguinte")
    void recentWeekEndsFromSunday() {
        List<LocalDate> weeks = AnpDownloadService.recentWeekEnds(LocalDate.of(2026, 10, 18), 1);

        assertEquals(List.of(LocalDate.of(2026, 10, 24)), weeks);
    }

    @Test
    @DisplayName("todas as semanas calculadas terminam em sábado")
    void allWeekEndsAreSaturdays() {
        for (LocalDate end : AnpDownloadService.recentWeekEnds(LocalDate.of(2026, 1, 1), 10)) {
            assertEquals(java.time.DayOfWeek.SATURDAY, end.getDayOfWeek());
        }
    }

    @Test
    @DisplayName("exige pelo menos uma semana")
    void requiresAtLeastOneWeek() {
        assertThrows(IllegalArgumentException.class,
                () -> AnpDownloadService.recentWeekEnds(LocalDate.of(2026, 10, 19), 0));
    }

    // ------------------------------------------------------------------ download

    @Test
    @DisplayName("devolve os bytes quando a planilha existe")
    void downloadsExistingFile() {
        serve("/2026/revendas_lpc_2026-10-04_2026-10-10.xlsx", 200, "application/vnd.ms-excel", XLSX_BYTES);

        Optional<byte[]> result = service.download(LocalDate.of(2026, 10, 10));

        assertTrue(result.isPresent());
        assertTrue(Arrays.equals(XLSX_BYTES, result.get()));
    }

    @Test
    @DisplayName("devolve vazio (sem erro) quando a semana ainda não foi publicada (404)")
    void returnsEmptyWhenNotPublished() {
        // Nenhum contexto registrado: o servidor responde 404.
        Optional<byte[]> result = service.download(LocalDate.of(2026, 10, 24));

        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("devolve vazio quando o portal responde 200 com uma página HTML no lugar do arquivo")
    void returnsEmptyWhenResponseIsHtml() {
        byte[] html = "<html><body>Página não encontrada</body></html>".getBytes(StandardCharsets.UTF_8);
        serve("/2026/revendas_lpc_2026-10-04_2026-10-10.xlsx", 200, "text/html", html);

        assertTrue(service.download(LocalDate.of(2026, 10, 10)).isEmpty());
    }

    @Test
    @DisplayName("lança erro em respostas inesperadas (ex.: 500 e 403)")
    void throwsOnUnexpectedStatus() {
        serve("/2026/revendas_lpc_2026-10-04_2026-10-10.xlsx", 500, "text/plain", "erro".getBytes(StandardCharsets.UTF_8));
        serve("/2026/revendas_lpc_2026-10-11_2026-10-17.xlsx", 403, "text/plain", "negado".getBytes(StandardCharsets.UTF_8));

        IllegalStateException serverError = assertThrows(IllegalStateException.class,
                () -> service.download(LocalDate.of(2026, 10, 10)));
        IllegalStateException forbidden = assertThrows(IllegalStateException.class,
                () -> service.download(LocalDate.of(2026, 10, 17)));

        assertTrue(serverError.getMessage().contains("500"));
        assertTrue(forbidden.getMessage().contains("403"));
    }

    @Test
    @DisplayName("lança erro quando não consegue conectar")
    void throwsWhenConnectionFails() {
        service.baseUrl = "http://127.0.0.1:1" + BASE_PATH; // porta 1: conexão recusada

        assertThrows(IllegalStateException.class, () -> service.download(LocalDate.of(2026, 10, 10)));
    }

    @Test
    @DisplayName("envia um User-Agent na requisição")
    void sendsUserAgent() {
        serve("/2026/revendas_lpc_2026-10-04_2026-10-10.xlsx", 200, "application/vnd.ms-excel", XLSX_BYTES);

        service.download(LocalDate.of(2026, 10, 10));

        assertTrue(receivedUserAgent.get() != null && !receivedUserAgent.get().isBlank());
    }

    // ------------------------------------------------------------------ helpers

    private void serve(String path, int status, String contentType, byte[] body) {
        server.createContext(BASE_PATH + path, exchange -> {
            receivedUserAgent.set(exchange.getRequestHeaders().getFirst("User-Agent"));
            exchange.getResponseHeaders().add("Content-Type", contentType);
            exchange.sendResponseHeaders(status, body.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(body);
            }
        });
    }
}