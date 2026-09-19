package com.billing.pos.dto;

import lombok.Data;

@Data
public class BillingOptionsData {
    private Integer discPer;
    private Boolean canBillWithoutStock;
}
