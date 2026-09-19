package com.billing.credit.dto;

import lombok.Data;

@Data
public class AccountTotalsData {
    private Long dueCount;
    private Double totalDue;
    private Double totalAdvance;
}
