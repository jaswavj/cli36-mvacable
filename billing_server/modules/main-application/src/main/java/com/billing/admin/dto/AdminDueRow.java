package com.billing.admin.dto;

import lombok.Data;

@Data
public class AdminDueRow {
    private String customerName;
    private Double balance;
    private Double cashPaid;
    private Double bankPaid;
    private String mode;
    private String bank;
    private String date;
    private String time;
    private String userName;
}
