package com.billing.transport.dto;

import lombok.Data;

@Data
public class TransportPaymentRow {
    private String txnType;
    private String date;
    private String time;
    private String utrNo;
    private Double amount;
    private Double cashPaid;
    private Double bankPaid;
    private Double balance;
    private Integer payMode;
}
