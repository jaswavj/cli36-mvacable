package com.billing.credit.dto;

import lombok.Data;

@Data
public class DuePartyData {
    private Long id;
    private String name;
    private String phone;
    private Double balance;
}
