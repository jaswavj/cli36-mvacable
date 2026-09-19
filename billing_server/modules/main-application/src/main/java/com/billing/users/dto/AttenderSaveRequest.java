package com.billing.users.dto;

import lombok.Data;

@Data
public class AttenderSaveRequest {
    private Long id;
    private String name;
    private String code;
}
