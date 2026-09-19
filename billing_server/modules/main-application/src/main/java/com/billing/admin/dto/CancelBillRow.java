package com.billing.admin.dto;

import lombok.Data;

@Data
public class CancelBillRow {
    private Long billId;
    private String billNo;
    private Double payable;
    private Double paid;
    private String reason;
    private String date;
    private String time;
    private String userName;
}
