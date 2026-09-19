package com.billing.master.dto;

import lombok.Data;

@Data
public class StockProductData {
    private Long id;
    private String name;
    private String code;
    private String categoryName;
    private String brandName;
    private Double stock;
    private Long batchId;
    private String unitName;
    private String convertionUnit;
    private Double convertionCalculation;
}
