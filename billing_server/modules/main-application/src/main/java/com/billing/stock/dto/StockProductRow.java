package com.billing.stock.dto;

import lombok.Data;

@Data
public class StockProductRow {
    private Long id;
    private String name;
    private Double rate;
    private String notes;
    private Double qty;
}