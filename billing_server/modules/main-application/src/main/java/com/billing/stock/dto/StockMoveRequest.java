package com.billing.stock.dto;

import lombok.Data;

@Data
public class StockMoveRequest {
    private Long productId;
    private Double qty;
    private Double rate;
    private String notes;
}