package com.billing.inventory.dto;

import lombok.Data;

@Data
public class PurchaseLineRequest {
    private Long productId;
    private String name;
    private Double qty;
    private Double freeQty;
    private Double cost;
    private Double mrp;
    private Double disc;
    private Double tax;
    private Double convertionCalc;
}
