package com.billing.expense.dto;

import lombok.Data;

@Data
public class ExpenseSaveRequest {
    private Long expenseType;
    private String content;
    private String description;
    private Double amount;
    private String expenseDate;
    private String expenseTime;
    private Integer payMode;
    private Integer payType;
    private Double cashPaid;
    private Double bankPaid;
    private Double balance;
}
