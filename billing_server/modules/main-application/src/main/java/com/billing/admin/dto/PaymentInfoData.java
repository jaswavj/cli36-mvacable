package com.billing.admin.dto;

import lombok.Data;

@Data
public class PaymentInfoData {
    private Long billId;
    private String billNo;
    private String date;
    private String cusName;
    private Double payable;
    private Integer paymentMode;
    private Integer paymentType;
    private Double cash;
    private Double bank;
}
