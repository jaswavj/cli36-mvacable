package com.billing.inventory.dto;

import lombok.Data;

import java.util.List;

@Data
public class SavePurchaseRequest {
    private Long supplierId;
    private String invoiceNo;
    private String invoiceDate;
    private Integer payType;
    private Integer bankId;
    private Double grandTotal;
    private Double paidAmount;
    private Double extraDisc;
    private Double balanceAmount;
    private List<PurchaseLineRequest> products;
}
