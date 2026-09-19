package com.billing.master.dto;

import lombok.Data;

@Data
public class CustomerMasterData {
    private Long id;
    private String name;
    private String address;
    private String phone;
    private String gstin;
    private Integer isGst;
    private Integer isEligibleForCommission;
}
