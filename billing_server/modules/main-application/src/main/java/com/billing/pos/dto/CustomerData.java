package com.billing.pos.dto;

import lombok.Data;

@Data
public class CustomerData {
    private Long id;
    private String name;
    private String phone;
    private String address;
    private String gstin;
    private Double creditLimit;
    private Integer isGst;
    private Integer isEligibleForCommission;
    private Double exchangePoint;
}
