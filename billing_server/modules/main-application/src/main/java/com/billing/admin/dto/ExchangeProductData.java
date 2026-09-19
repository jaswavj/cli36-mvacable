package com.billing.admin.dto;

import lombok.Data;

@Data
public class ExchangeProductData {
    private Long id;
    private String name;
    private Double mrp;
    private String code;
}
