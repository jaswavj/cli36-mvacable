package com.billing.inventory.dto;

import lombok.Data;

@Data
public class SupplierPaymentRow {
    private Long id;
    private String date;
    private String prno;
    private String supplierName;
    private Double total;
    private Double paid;
    private Double balance;
}
