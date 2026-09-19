package com.billing.pos.dto;

import lombok.Data;

@Data
public class QuotationLineData {
    private Long productId;
    private String name;
    private String code;
    private Double qty;
    private Double price;
    private Double discount;
    private Double total;
    private Integer gst;
    private Long batchId;
    private Double commission;
    private String unitName;
}
