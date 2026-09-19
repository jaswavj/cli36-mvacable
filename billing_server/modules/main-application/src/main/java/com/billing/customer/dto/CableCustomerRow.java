package com.billing.customer.dto;

import lombok.Data;

@Data
public class CableCustomerRow {
    private Long id;
    private String customerType;
    private String customerId;
    private String name;
    private String mobile;
    private String address;
    private String area;
    private String joiningDate;
    private String joiningDateIso;
    private String disconnectDate;
    private String disconnectDateIso;
    private String disconnectNotes;
    private String reconnectDate;
    private String reconnectDateIso;
    private String reconnectNotes;
    private String notes;
    private Double monthlyAmount;
    private Integer isActive;
    private Long uid;
    private String createdBy;
    private String shopId;
}
