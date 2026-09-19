package com.billing.collection.dto;

import lombok.Data;

@Data
public class CollectionItemRequest {
    private String month;
    private Double amount;
    private String payMode;
}
