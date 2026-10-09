package com.gabrielmkv.service;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;

import com.gabrielmkv.entity.FuelCollector;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

@ApplicationScoped 
public class AnpParserService {
    
    @Transactional 
    public void processing(InputStream excelInputStream) {
        try (Workbook workbook = WorkbookFactory.create(excelInputStream)) {
                Sheet sheet = workbook.getSheet("POSTOS REVENDEDORES");
                if (sheet == null) {
                    System.err.println("Aba 'POSTOS REVENDEDORES' não encontrada no arquivo!");
                    return;
                }

                int initialRow = 9;
                for (int i = initialRow; i <= sheet.getLastRowNum(); i++) {
                    Row row = sheet.getRow(i);
                    if (row == null) continue;

                    String municipality = getCellValueAsString(row.getCell(8));
                    if (municipality.equalsIgnoreCase("PARA DE MINAS")) {
                        
                        String cnpj = getCellValueAsString(row.getCell(0));
                        String product = getCellValueAsString(row.getCell(11));
                        LocalDate collectionDate = getCellValueAsDate(row.getCell(14));

                        if (collectionDate == null) {
                            continue;
                        }

                        FuelCollector fuelCollector = new FuelCollector();
                        fuelCollector.cnpj = cnpj;
                        fuelCollector.legalName = getCellValueAsString(row.getCell(1));
                        fuelCollector.tradeName = getCellValueAsString(row.getCell(2));
                        fuelCollector.address = getCellValueAsString(row.getCell(3));
                        fuelCollector.neighborhood = getCellValueAsString(row.getCell(6));
                        fuelCollector.brand = getCellValueAsString(row.getCell(10));
                        fuelCollector.product = product;
                        fuelCollector.price = getCellValueAsDouble(row.getCell(13));
                        fuelCollector.collectionDate = collectionDate;
                        fuelCollector.processingDate = LocalDateTime.now();
                        fuelCollector.persist();
                    }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

        private String getCellValueAsString(Cell cell) {
            if (cell == null) return "";
            return switch (cell.getCellType()) {
                case STRING -> cell.getStringCellValue().trim();
                case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
                default -> "";
            };
        }

        private Double getCellValueAsDouble(Cell cell) {
            if (cell == null) return 0.0;
            if (cell.getCellType() == CellType.NUMERIC) {
                return cell.getNumericCellValue();
            } else if (cell.getCellType() == CellType.STRING) {
                try {
                    return Double.parseDouble(cell.getStringCellValue().replace(",", "."));
                } catch (NumberFormatException e) {
                    return 0.0;
                }
            }
            return 0.0;
        }

        private LocalDate getCellValueAsDate(Cell cell) {
            if (cell == null) return null;
            if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                return cell.getDateCellValue()
                        .toInstant()
                        .atZone(ZoneId.systemDefault())
                        .toLocalDate();
            }
            return null;
        }
    }
