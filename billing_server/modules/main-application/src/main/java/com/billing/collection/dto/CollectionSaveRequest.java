package com.billing.collection.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CollectionSaveRequest {
    private String customerId;
    private List<CollectionItemRequest> items = new ArrayList<>();
}
