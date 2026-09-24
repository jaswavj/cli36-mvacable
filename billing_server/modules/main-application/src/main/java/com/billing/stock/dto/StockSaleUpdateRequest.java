package com.billing.stock.dto;

import lombok.Data;

@Data
public class StockSaleUpdateRequest {
    private Double qty;
    private Double rate;
    private String notes;
    private String reason;
}