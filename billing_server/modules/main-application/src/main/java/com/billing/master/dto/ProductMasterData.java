package com.billing.master.dto;

import lombok.Data;

@Data
public class ProductMasterData {
    private Long id;
    private String name;
    private String code;
    private String categoryName;
    private String brandName;
    private Double mrp;
    private String discountDisplay;
    private Double stock;
    private Double addedStock;
    private Double cost;
    private Integer discType;
    private Double discount;
    private Integer gst;
    private Long unitId;
    private String hsn;
    private String unitName;
    private Double commission;
    private Long categoryId;
    private Long brandId;
}
