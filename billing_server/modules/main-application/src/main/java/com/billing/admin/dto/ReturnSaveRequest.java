package com.billing.admin.dto;

import lombok.Data;

@Data
public class ReturnSaveRequest {
    private String billNo;
    private Long detailId;
    private Double returnQty;
}
