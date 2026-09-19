package com.billing.inventory.dto;

import lombok.Data;

@Data
public class SupplierData {
    private Long id;
    private String name;
    private String description;
    private String phone;
    private String gstin;
    private Integer isGst;
}
