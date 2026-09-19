package com.billing.inventory.dto;

import lombok.Data;

@Data
public class PurchaseHistoryData {
    private String supplierName;
    private String dateTime;
    private String invoiceNo;
    private Double qty;
    private Double free;
    private Double cost;
    private Double mrp;
    private Double disc;
    private Double tax;
    private String unitName;
}
