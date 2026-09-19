package com.billing.master.dto;

import lombok.Data;

@Data
public class BulkUpdateItem {
    private Long productId;
    private Long batchId;
    private String code;
    private Double cost;
    private Double mrp;
    private Integer gst;
}
