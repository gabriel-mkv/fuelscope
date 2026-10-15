package com.gabrielmkv.model;

import java.math.BigDecimal;
import java.time.LocalDate;

public record FuelPrice(
    String cnpj,
    String legalName,
    String tradeName,
    String address,
    String neighborhood,
    String brand,
    String product,
    BigDecimal price,
    LocalDate collectionDate
) {
}