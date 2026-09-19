package com.billing.admin.dto;

import lombok.Data;

@Data
public class AdminBillLine {
    private Long id;
    private Long productId;
    private String productName;
    private Double qty;
    private Double price;
    private Double disc;
    private Double total;
}
