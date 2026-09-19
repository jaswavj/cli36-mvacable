package com.billing.credit.dto;

import lombok.Data;

@Data
public class TimelineRow {
    private String type;
    private String docNo;
    private Double amount;
    private Double paid;
    private Double pending;
    private String date;
    private String time;
    private String userName;
    private Long refId;
    private String notes;
}
