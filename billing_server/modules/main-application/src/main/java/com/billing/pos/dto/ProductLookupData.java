package com.billing.pos.dto;

import lombok.Data;

@Data
public class ProductLookupData {
    private Long id;
    private String code;
    private String name;
    private Double mrp;
    private Double discount;
    private Long batchId;
    private Long unitId;
    private String unitName;
    private Double commission;
    private String convertionUnit;
    private Double stock;
}
