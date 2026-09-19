package com.billing.master.dto;

import lombok.Data;

@Data
public class StockAdjustRequest {
    private Long productId;
    private Long batchId;
    private Integer type;
    private Double quantity;
    private String reason;
    private String reasonCategory;
}
