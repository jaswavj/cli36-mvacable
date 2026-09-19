package com.billing.master.dto;

import lombok.Data;

@Data
public class BulkProductData {
    private Long id;
    private String name;
    private String code;
    private Integer gst;
    private String categoryName;
    private Double mrp;
    private Long batchId;
    private Double cost;
    private String brandName;
}
