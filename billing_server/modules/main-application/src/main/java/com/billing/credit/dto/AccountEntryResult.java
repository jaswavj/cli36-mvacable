package com.billing.credit.dto;

import lombok.Data;

@Data
public class AccountEntryResult {
    private String entryType;
    private Double newBalance;
    private Double newAdvance;
}
