package com.billing.expense.dto;

import lombok.Data;

@Data
public class ExpenseTypeSaveRequest {
    private Long id;
    private String name;
}
