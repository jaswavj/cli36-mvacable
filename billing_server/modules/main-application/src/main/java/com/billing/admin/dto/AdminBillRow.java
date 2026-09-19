package com.billing.admin.dto;

import lombok.Data;

@Data
public class AdminBillRow {
    private Long id;
    private String billNo;
    private Double total;
    private Double discount;
    private Double payable;
    private Double paid;
    private Double balance;
    private String date;
    private String time;
    private String userName;
}
