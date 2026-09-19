package com.billing.collection.dto;

import lombok.Data;

@Data
public class DashboardCollector {
    private String name;
    private Integer count;
    private Double cash;
    private Double upi;
    private Double total;
}
