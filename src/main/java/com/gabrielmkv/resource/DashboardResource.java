package com.gabrielmkv.resource;

import java.util.List;

import com.gabrielmkv.entity.FuelCollector;

import io.quarkus.qute.Location;
import io.quarkus.qute.Template;
import io.quarkus.qute.TemplateInstance;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

@Path("/")
public class DashboardResource {

    @Inject
    @Location("dashboard.html")
    Template dashboard;

    @GET
    @Produces(MediaType.TEXT_HTML)
    public TemplateInstance exibirDashboard(
            @QueryParam("product") String product) {

        List<FuelCollector> postos;

        if (product != null && !product.isBlank()) {
            postos = FuelCollector.list(
                    "product = ?1 order by price asc",
                    product
            );
        } else {
            postos = FuelCollector.list("order by price asc");
        }

        long totalRegistros = FuelCollector.count();

        return dashboard
                .data("postos", postos)
                .data("totalRegistros", totalRegistros)
                .data("productSelecionado", product);
    }
}
