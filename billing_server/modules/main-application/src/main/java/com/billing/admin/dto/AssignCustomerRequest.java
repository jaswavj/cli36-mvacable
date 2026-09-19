package com.billing.admin.dto;

import lombok.Data;

@Data
public class AssignCustomerRequest {
    private Long billId;
    private Long customerId;
    private String cusName;
    private String cusPhn;
}
