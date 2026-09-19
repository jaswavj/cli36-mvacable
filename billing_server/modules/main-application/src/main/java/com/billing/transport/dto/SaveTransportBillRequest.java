package com.billing.transport.dto;

import lombok.Data;

@Data
public class SaveTransportBillRequest {
    private Long customerId;
    private String customerName;
    private String customerPhn;
    private String loadFrom;
    private String loadTo;
    private Double freightAmount;
    private Double cashPaid;
    private Double bankPaid;
    private Double balance;
    private Integer mode;
    private Integer type;
    private String payDate;
    private String utrNo;
}
