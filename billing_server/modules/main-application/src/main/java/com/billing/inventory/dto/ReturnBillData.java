package com.billing.inventory.dto;

import lombok.Data;

import java.util.List;

@Data
public class ReturnBillData {
    private Long id;
    private String prno;
    private String invoiceNo;
    private String invoiceDate;
    private Double total;
    private String supplierName;
    private List<ReturnLineData> items;
}
