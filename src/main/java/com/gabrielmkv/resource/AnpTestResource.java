package com.gabrielmkv.resource;

import com.gabrielmkv.scheduler.AnpSchedulerService;

import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/anp-test")
public class AnpTestResource {
    
    @Inject 
    AnpSchedulerService anpSchedulerService;

    @GET 
    @Produces(MediaType.TEXT_PLAIN)
    public Response execute() {
        anpSchedulerService.scheduleAnpProcessing();
        return Response.ok("Processamento do arquivo ANP iniciado.").build();
    }
}
