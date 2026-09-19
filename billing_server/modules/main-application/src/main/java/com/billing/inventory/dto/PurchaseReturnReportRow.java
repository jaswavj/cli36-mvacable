package com.billing.inventory.dto;

import lombok.Data;

@Data
public class PurchaseReturnReportRow {
    private Long id;
    private String returnNo;
    private Long purchaseId;
    private String prno;
    private String supplierName;
    private Double total;
    private String notes;
    private String dateTime;
    private String enteredBy;
}
