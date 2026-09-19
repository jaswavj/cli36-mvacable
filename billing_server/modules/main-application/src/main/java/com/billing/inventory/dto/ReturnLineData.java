package com.billing.inventory.dto;

import lombok.Data;

@Data
public class ReturnLineData {
    private Long detailId;
    private String product;
    private Double qty;
    private Double free;
    private Double rate;
    private Double mrp;
    private Double alreadyReturned;
    private Double availableQty;
}
