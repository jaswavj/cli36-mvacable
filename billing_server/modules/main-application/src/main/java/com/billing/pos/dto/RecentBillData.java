package com.billing.pos.dto;

import lombok.Data;

@Data
public class RecentBillData {
    private Long id;
    private String billDisplay;
    private Double total;
    private Double paid;
    private String date;
    private String time;
    private String customerName;
}
