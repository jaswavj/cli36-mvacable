package com.billing.pos.dto;

import lombok.Data;

@Data
public class BillLineRequest {
    private Long id;
    private Double qty;
    private Double price;
    private Double discount;
    private Double total;
    private Long batchId;
    private Double commission;
}
