package com.billing.inventory.dto;

import lombok.Data;

@Data
public class PurchaseReportRow {
    private Long id;
    private String invoiceNo;
    private String invoiceDate;
    private Double total;
    private Double paid;
    private Double balance;
    private String entryDate;
    private String entryTime;
    private String userName;
    private String supplierName;
    private String prno;
}
