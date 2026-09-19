package com.billing.master.dto;

import lombok.Data;

@Data
public class ComponentSaveRequest {
    private Long productId;
    private Long componentProductId;
    private Double quantity;
}
