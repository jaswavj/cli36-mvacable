package com.billing.master.dto;

import lombok.Data;

@Data
public class ProductSaveRequest {
    private Long id;
    private String name;
    private String code;
    private Long categoryId;
    private Long brandId;
    private Long unitId;
    private String hsn;
    private Double stock;
    private Double cost;
    private Double mrp;
    private Double commission;
    private Integer discType;
    private Double discount;
    private Integer gst;
}
