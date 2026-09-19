package com.billing.accountreport;

import lombok.Data;

@Data
public class OpeningBalanceRequest {
    private String balanceDate;
    private Double amount;
    private String notes;
    private Integer payMode;
    private Integer payType;
    private Double cashPaid;
    private Double bankPaid;
}
