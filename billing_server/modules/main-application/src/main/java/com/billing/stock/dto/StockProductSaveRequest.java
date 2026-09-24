package com.billing.stock.dto;

import lombok.Data;

@Data
public class StockProductSaveRequest {
    private Long id;
    private String name;
    private Double rate;
    private String notes;
}