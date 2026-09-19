package com.billing.credit.dto;

import lombok.Data;

@Data
public class AccountEntryRequest {
    private String entryType;
    private Double cashPaid;
    private Double bankPaid;
    private Integer payMode;
    private Integer payType;
    private Double amount;
    private String notes;
}
