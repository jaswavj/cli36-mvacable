package com.billing.collection.dto;

import lombok.Data;

@Data
public class CollectionReportRow {
    private Long id;
    private String paidDate;
    private String paidTime;
    private String customerType;
    private String customerId;
    private String customerName;
    private String mobile;
    private String area;
    private String month;
    private String monthLabel;
    private String payMode;
    private Double amount;
    private String collectedBy;
}
