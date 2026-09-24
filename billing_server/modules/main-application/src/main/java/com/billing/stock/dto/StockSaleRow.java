package com.billing.stock.dto;

import lombok.Data;

@Data
public class StockSaleRow {
    private Long id;
    private Long productId;
    private String productName;
    private Double qty;
    private Double rate;
    private Double amount;
    private String notes;
    private String saleDate;
    private String saleTime;
    private String soldBy;
}