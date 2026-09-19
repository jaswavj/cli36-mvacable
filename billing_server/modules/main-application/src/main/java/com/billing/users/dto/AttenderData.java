package com.billing.users.dto;

import lombok.Data;

@Data
public class AttenderData {
    private Long id;
    private String name;
    private String code;
    private Integer isActive;
}
