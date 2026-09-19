package com.billing.collection.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class AccountReportData {
    private Double collectionTotal;
    private Double expenseTotal;
    private Double finalAmount;
    private Integer collectionCount;
    private Integer expenseCount;
    private Double cashTotal;
    private Double upiTotal;
    private Double cableTotal;
    private Double wifiTotal;
    private List<AccountExpenseRow> expenses = new ArrayList<>();
}
