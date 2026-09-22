package com.billing.collection.dto;

import lombok.Data;

@Data
public class CollectionPaymentRow {
    private Long id;
    private String month;
    private String monthLabel;
    private Double amount;
    private String payMode;
    private String paidDate;
    private String paidTime;
    private String rechargeDate;
    private String collectedBy;
}
