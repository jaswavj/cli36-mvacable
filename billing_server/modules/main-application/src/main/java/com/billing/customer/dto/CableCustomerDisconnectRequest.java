package com.billing.customer.dto;

import lombok.Data;

@Data
public class CableCustomerDisconnectRequest {
    private String disconnectDate;
    private String notes;
}
