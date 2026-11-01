package com.billing.expense.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class SalonExpenseReportData {
    private List<SalonExpenseRow> rows = new ArrayList<>();
    private Double grandTotal = 0.0;
    private Double cashTotal = 0.0;
    private Double upiTotal = 0.0;
    private Double cableTotal = 0.0;
    private Double wifiTotal = 0.0;
    private Integer count = 0;
}
