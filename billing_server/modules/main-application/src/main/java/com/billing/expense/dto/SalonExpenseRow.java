package com.billing.expense.dto;

import lombok.Data;

@Data
public class SalonExpenseRow {
    private Long id;
    private Double amount;
    private String expenseFor;
    private String shopId;
    private String shopName;
    private Long userId;
    private String userName;
    private String expenseDate;
    private String expenseTime;
}
