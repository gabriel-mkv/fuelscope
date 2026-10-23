package com.gabrielmkv.service;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.jboss.logging.Logger;

import com.gabrielmkv.model.FuelPrice;

import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class AnpParserService {

    private static final Logger LOG = Logger.getLogger(AnpParserService.class);

    private static final String SHEET_NAME = "POSTOS REVENDEDORES";
    private static final int MAX_HEADER_SEARCH_ROWS = 30;
    private static final DateTimeFormatter BR_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /**
     * Combustíveis de uso veicular (nomes já normalizados: maiúsculos, sem acento).
     * Qualquer produto fora desta lista é ignorado, o que exclui o GLP (gás de cozinha).
     * Para restringir ainda mais, remova itens daqui (ex.: DIESEL S10, DIESEL S500, GNV).
     */
    private static final Set<String> VEHICLE_FUELS = Set.of(
            "GASOLINA COMUM",
            "GASOLINA ADITIVADA",
            "ETANOL",
            "DIESEL S10",
            "DIESEL S500",
            "GNV");

    public List<FuelPrice> processingAnpData(InputStream excelInputStream, String municipality, String state) {
        String targetCity = normalize(municipality);
        String targetState = normalize(state);

        List<FuelPrice> fuelPrices = new ArrayList<>();
        int matchedRows = 0;
        int skippedRows = 0;
        Set<String> ignoredProducts = new TreeSet<>();

        try (Workbook workbook = WorkbookFactory.create(excelInputStream)) {
            Sheet sheet = workbook.getSheet(SHEET_NAME);
            if (sheet == null) {
                throw new IllegalArgumentException("Aba '" + SHEET_NAME + "' não encontrada no arquivo ANP.");
            }

            // O cabeçalho é localizado pelo conteúdo, não por número de linha fixo,
            // e as colunas são mapeadas pelo nome. Se a ANP reordenar colunas, o parser continua certo.
            int headerRowIndex = findHeaderRow(sheet);
            Map<String, Integer> columns = readHeader(sheet.getRow(headerRowIndex));

            int cCnpj = requireColumn(columns, "CNPJ");
            int cLegalName = requireColumn(columns, "RAZAO");
            int cTradeName = requireColumn(columns, "FANTASIA");
            int cAddress = requireColumn(columns, "ENDERECO");
            int cNeighborhood = requireColumn(columns, "BAIRRO");
            int cCity = requireColumn(columns, "MUNICIPIO");
            int cState = requireColumn(columns, "ESTADO");
            int cBrand = requireColumn(columns, "BANDEIRA");
            int cProduct = requireColumn(columns, "PRODUTO");
            int cPrice = requireColumn(columns, "PRECO DE REVENDA");
            int cDate = requireColumn(columns, "DATA DA COLETA");

            Integer cNumber = columns.get("NUMERO");
            if (cNumber == null) {
                LOG.warn("Coluna 'NUMERO' não encontrada; endereços ficarão sem número.");
            }

            for (int i = headerRowIndex + 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                if (!targetCity.equals(normalize(text(row.getCell(cCity))))) continue;
                if (!targetState.equals(normalize(text(row.getCell(cState))))) continue;

                String product = text(row.getCell(cProduct));
                if (!VEHICLE_FUELS.contains(normalize(product))) {
                    ignoredProducts.add(product);
                    continue;
                }
                matchedRows++;

                String cnpj = cnpj(row.getCell(cCnpj));
                String legalName = text(row.getCell(cLegalName));
                String tradeName = text(row.getCell(cTradeName));
                if (tradeName.isBlank()) {
                    // FANTASIA vem vazio em boa parte dos postos; usa a razão social para ter o que exibir.
                    tradeName = legalName;
                }
                String number = cNumber == null ? "" : text(row.getCell(cNumber));
                String address = fullAddress(text(row.getCell(cAddress)), number);
                String neighborhood = text(row.getCell(cNeighborhood));
                String brand = text(row.getCell(cBrand));
                LocalDate collectionDate = date(row.getCell(cDate));
                BigDecimal price = decimal(row.getCell(cPrice));

                if (cnpj.isBlank() || product.isBlank() || collectionDate == null
                        || price == null || price.signum() <= 0) {
                    skippedRows++;
                    continue;
                }

                fuelPrices.add(new FuelPrice(
                        cnpj, legalName, tradeName, address, neighborhood,
                        brand, product, price, collectionDate));
            }

            if (!ignoredProducts.isEmpty()) {
                LOG.infof("Produtos ignorados (fora da lista de combustíveis veiculares): %s", ignoredProducts);
            }
            if (skippedRows > 0) {
                LOG.warnf("%d de %d linhas de %s/%s foram ignoradas por dados inválidos.",
                        skippedRows, matchedRows, municipality, state);
            }
            if (fuelPrices.isEmpty()) {
                throw new IllegalArgumentException(
                        "Nenhum preço válido foi encontrado para " + municipality + " - " + state + ".");
            }

            LOG.infof("%d preços lidos para %s - %s.", fuelPrices.size(), municipality, state);
            return List.copyOf(fuelPrices);

        } catch (IOException e) {
            throw new IllegalStateException("Não foi possível ler a planilha da ANP.", e);
        }
    }

    private int findHeaderRow(Sheet sheet) {
        int limit = Math.min(sheet.getLastRowNum(), MAX_HEADER_SEARCH_ROWS);
        for (int i = 0; i <= limit; i++) {
            Row row = sheet.getRow(i);
            if (row != null && "CNPJ".equals(normalize(text(row.getCell(0))))) {
                return i;
            }
        }
        throw new IllegalStateException(
                "Cabeçalho (coluna 'CNPJ') não encontrado nas primeiras " + MAX_HEADER_SEARCH_ROWS + " linhas.");
    }

    private Map<String, Integer> readHeader(Row headerRow) {
        Map<String, Integer> columns = new HashMap<>();
        for (Cell cell : headerRow) {
            String name = normalize(text(cell));
            if (!name.isBlank()) {
                columns.put(name, cell.getColumnIndex());
            }
        }
        return columns;
    }

    private int requireColumn(Map<String, Integer> columns, String name) {
        Integer index = columns.get(name);
        if (index == null) {
            throw new IllegalStateException("Coluna '" + name + "' não encontrada no cabeçalho da planilha.");
        }
        return index;
    }

    /** Maiúsculas, sem acento e sem espaços nas pontas: "PARÁ DE MINAS " -> "PARA DE MINAS". */
    private String normalize(String value) {
        if (value == null) return "";
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .trim()
                .toUpperCase();
    }

    /**
     * Junta rua e número ("RUA X" + "123" -> "RUA X, 123") para o endereço servir de busca no mapa.
     * Sem número (vazio ou "S/N"), devolve só a rua.
     */
    private String fullAddress(String street, String number) {
        boolean noNumber = number.isBlank() || normalize(number).matches("S\\s*[/.]?\\s*N\\.?");
        if (street.isBlank() || noNumber) {
            return street;
        }
        return street + ", " + number;
    }

    private String text(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> BigDecimal.valueOf(cell.getNumericCellValue()).stripTrailingZeros().toPlainString();
            default -> "";
        };
    }

    /**
     * O CNPJ vem numérico na planilha, então os zeros à esquerda se perdem
     * (08220930000162 vira 8220930000162). Restaura para 14 dígitos.
     */
    private String cnpj(Cell cell) {
        String digits = text(cell).replaceAll("\\D", "");
        if (digits.isEmpty()) return "";
        return "0".repeat(Math.max(0, 14 - digits.length())) + digits;
    }

    private BigDecimal decimal(Cell cell) {
        if (cell == null) return null;
        try {
            BigDecimal value = null;
            if (cell.getCellType() == CellType.NUMERIC) {
                value = BigDecimal.valueOf(cell.getNumericCellValue());
            } else if (cell.getCellType() == CellType.STRING) {
                String raw = cell.getStringCellValue().trim().replace(",", ".");
                if (!raw.isBlank()) {
                    value = new BigDecimal(raw);
                }
            }
            // Preços da ANP têm 2 casas; elimina resíduos de ponto flutuante.
            return value == null ? null : value.setScale(2, RoundingMode.HALF_UP);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private LocalDate date(Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            // Sem passar por Date/ZoneId: não depende do fuso do runner.
            return cell.getLocalDateTimeCellValue().toLocalDate();
        }
        if (cell.getCellType() == CellType.STRING) {
            try {
                return LocalDate.parse(cell.getStringCellValue().trim(), BR_DATE);
            } catch (DateTimeParseException e) {
                return null;
            }
        }
        return null;
    }
}