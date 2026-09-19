package com.billing.expense.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class SalonExpenseReportData {
    private List<SalonExpenseRow> rows = new ArrayList<>();
    private Double grandTotal = 0.0;
    private Integer count = 0;
}
