package com.billing.collection.dto;

import lombok.Data;

@Data
public class PendingCustomerRow {
    private Long id;
    private String customerType;
    private String customerId;
    private String name;
    private String mobile;
    private String area;
    private String joiningDate;
    private Double monthlyAmount;
    private Integer pendingMonths;
    private Double pendingAmount;
    private String firstPendingMonth;
}
