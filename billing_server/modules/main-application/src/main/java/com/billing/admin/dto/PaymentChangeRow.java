package com.billing.admin.dto;

import lombok.Data;

@Data
public class PaymentChangeRow {
    private Long billId;
    private String billNo;
    private Double oldCash;
    private Double newCash;
    private Double oldBank;
    private Double newBank;
    private String bankMode;
    private String userName;
    private String dateTime;
}
