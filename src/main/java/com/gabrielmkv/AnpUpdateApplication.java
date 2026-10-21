package com.gabrielmkv;

import org.jboss.logging.Logger;

import com.gabrielmkv.service.AnpUpdateService;

import io.quarkus.runtime.QuarkusApplication;
import io.quarkus.runtime.annotations.QuarkusMain;
import jakarta.inject.Inject;

/**
 * Ponto de entrada de execução única: roda a atualização e encerra.
 * Código de saída 0 = sucesso, 1 = falha (o GitHub Actions marca o job como falho e não faz commit).
 */
@QuarkusMain
public class AnpUpdateApplication implements QuarkusApplication {

    private static final Logger LOG = Logger.getLogger(AnpUpdateApplication.class);

    @Inject
    AnpUpdateService updateService;

    @Override
    public int run(String... args) {
        try {
            updateService.run();
            return 0;
        } catch (RuntimeException e) {
            LOG.error("Falha na atualização dos preços da ANP.", e);
            return 1;
        }
    }
}