package com.billing.master.dto;

import lombok.Data;

@Data
public class ComponentData {
    private Long id;
    private String name;
    private String code;
    private Double quantity;
    private Long componentProductId;
}
