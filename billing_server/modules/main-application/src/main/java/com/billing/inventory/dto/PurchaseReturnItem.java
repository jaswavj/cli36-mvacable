package com.billing.inventory.dto;

import lombok.Data;

@Data
public class PurchaseReturnItem {
    private Long detailId;
    private Double qty;
    private Double rate;
}
