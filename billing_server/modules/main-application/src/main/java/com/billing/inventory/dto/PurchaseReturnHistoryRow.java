package com.billing.inventory.dto;

import lombok.Data;

@Data
public class PurchaseReturnHistoryRow {
    private String returnNo;
    private Double qty;
    private Double rate;
    private Double total;
    private String notes;
    private String dateTime;
    private String enteredBy;
}
