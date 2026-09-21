package com.billing.collection.dto;

import lombok.Data;

@Data
public class DashboardDay {
    private String date;
    private String iso;
    private Double cash;
    private Double upi;
    private Double total;
}
