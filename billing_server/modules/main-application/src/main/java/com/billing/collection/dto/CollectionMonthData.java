package com.billing.collection.dto;

import lombok.Data;

@Data
public class CollectionMonthData {
    private String month;
    private String label;
    private boolean paid;
    private String paidDate;
    private String paidDateIso;
    private String payMode;
    private Double due;
    private Double paidAmount;
    private Double balance;
    private Double amount;
}
