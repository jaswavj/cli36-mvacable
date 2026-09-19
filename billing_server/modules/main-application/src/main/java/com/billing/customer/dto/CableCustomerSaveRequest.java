package com.billing.customer.dto;

import lombok.Data;

@Data
public class CableCustomerSaveRequest {
    private Long id;
    private String customerType;
    private String customerId;
    private String name;
    private String mobile;
    private String address;
    private String area;
    private String joiningDate;
    private String notes;
    private Double monthlyAmount;
}
