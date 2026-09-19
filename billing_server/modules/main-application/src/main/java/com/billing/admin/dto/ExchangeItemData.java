package com.billing.admin.dto;

import lombok.Data;

@Data
public class ExchangeItemData {
    private Long detailId;
    private Long prodId;
    private String productName;
    private Double qty;
    private Double price;
    private Double disc;
    private Double total;
    private Integer isExchanged;
}
