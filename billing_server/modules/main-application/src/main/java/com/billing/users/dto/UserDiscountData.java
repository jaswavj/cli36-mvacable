package com.billing.users.dto;

import lombok.Data;

@Data
public class UserDiscountData {
    private Long id;
    private String userName;
    private String fullName;
    private Integer discPer;
}
