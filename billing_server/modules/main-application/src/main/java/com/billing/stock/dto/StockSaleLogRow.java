package com.billing.stock.dto;

import lombok.Data;

@Data
public class StockSaleLogRow {
    private Long id;
    private Long saleId;
    private String action;
    private String productName;
    private Double oldQty;
    private Double newQty;
    private Double oldRate;
    private Double newRate;
    private Double oldAmount;
    private Double newAmount;
    private String reason;
    private String userName;
    private String logDate;
    private String logTime;
}