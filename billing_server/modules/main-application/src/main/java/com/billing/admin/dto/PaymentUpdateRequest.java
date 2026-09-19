package com.billing.admin.dto;

import lombok.Data;

@Data
public class PaymentUpdateRequest {
    private Long billId;
    private Double cash;
    private Double bank;
    private Integer bankMode;
}
