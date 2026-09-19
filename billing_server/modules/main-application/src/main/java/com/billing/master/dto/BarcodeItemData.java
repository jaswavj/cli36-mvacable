package com.billing.master.dto;

import lombok.Data;

@Data
public class BarcodeItemData {
    private Long id;
    private String name;
    private String code;
    private Double mrp;
    private String unit;
}
