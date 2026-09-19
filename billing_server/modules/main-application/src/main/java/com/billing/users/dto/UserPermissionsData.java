package com.billing.users.dto;

import lombok.Data;

import java.util.List;

@Data
public class UserPermissionsData {
    private Long userId;
    private String name;
    private List<ModuleData> all;
    private List<Long> selectedIds;
}
