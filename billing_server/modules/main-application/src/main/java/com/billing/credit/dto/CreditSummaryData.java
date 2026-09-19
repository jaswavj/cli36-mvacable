package com.billing.credit.dto;

import lombok.Data;

import java.util.List;

@Data
public class CreditSummaryData {
    private AccountTotalsData totals;
    private List<DuePartyData> dueList;
}
