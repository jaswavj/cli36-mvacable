package com.billing.inventory.dto;

import lombok.Data;

@Data
public class PurchaseProductData {
    private Long id;
    private String name;
    private String code;
    private String categoryName;
    private String brandName;
    private Double cost;
    private Double mrp;
    private Long batchId;
    private String unitName;
    private String convertionUnit;
    private Double convertionCalculation;
    private Integer gst;
}
