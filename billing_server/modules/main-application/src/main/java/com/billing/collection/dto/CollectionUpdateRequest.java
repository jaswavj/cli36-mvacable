package com.billing.collection.dto;

import lombok.Data;

@Data
public class CollectionUpdateRequest {
    private Double amount;
    private String payMode;
    private String paidDate;
    private String reason;
}
