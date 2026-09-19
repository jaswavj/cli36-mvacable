package com.billing.admin.dto;

import lombok.Data;

@Data
public class ExchangeSaveRequest {
    private String billNo;
    private Long detailId;
    private Long newProdId;
    private Double newPrice;
}
