package com.billing.collection.dto;

import lombok.Data;

@Data
public class AccountExpenseRow {
    private Long id;
    private String expenseDate;
    private String expenseTime;
    private String expenseFor;
    private Double amount;
    private String userName;
}
