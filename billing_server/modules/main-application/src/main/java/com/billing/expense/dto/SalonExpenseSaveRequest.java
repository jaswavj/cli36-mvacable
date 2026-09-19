package com.billing.expense.dto;

import lombok.Data;

@Data
public class SalonExpenseSaveRequest {
    private Double amount;
    private String expenseFor;
}
