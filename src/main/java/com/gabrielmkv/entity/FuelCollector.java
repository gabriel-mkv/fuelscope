package com.gabrielmkv.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity 
public class FuelCollector extends PanacheEntity {
    
    public String cnpj;
    public String legalName;
    public String tradeName;
    public String address;
    public String neighborhood;
    public String brand;
    public String product;
    public double price;
    public LocalDate collectionDate;
    public LocalDateTime processingDate;
    
}
