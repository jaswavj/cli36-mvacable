package com.billing.inventory.dto;

import lombok.Data;

@Data
public class PurchaseDetailLine {
    private Long id;
    private String productName;
    private Double pack;
    private Double qtyPack;
    private Double quantity;
    private Double free;
    private Double rate;
    private Double mrp;
    private Double totalAmt;
    private Double tax;
    private Double netAmt;
}
