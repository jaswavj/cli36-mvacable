package com.billing.users.dto;

import lombok.Data;

import java.util.List;

@Data
public class PermissionUpdateRequest {
    private List<Long> ids;
}
