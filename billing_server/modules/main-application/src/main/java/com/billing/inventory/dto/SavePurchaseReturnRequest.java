package com.billing.inventory.dto;

import lombok.Data;

import java.util.List;

@Data
public class SavePurchaseReturnRequest {
    private Long purchaseId;
    private String notes;
    private List<PurchaseReturnItem> items;
}
