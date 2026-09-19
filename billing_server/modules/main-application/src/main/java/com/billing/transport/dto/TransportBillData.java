package com.billing.transport.dto;

import lombok.Data;

@Data
public class TransportBillData {
    private Long id;
    private String trNo;
    private Long customerId;
    private String name;
    private String phone;
    private String loadFrom;
    private String loadTo;
    private String vehicleNo;
    private String driverNo;
    private String ownerNo;
    private String payDate;
    private String utrNo;
    private Double vehFreight;
    private Double vehPaid;
    private Double vehCashPaid;
    private Double vehBankPaid;
    private Double vehBalance;
    private Integer vehPaymentMode;
    private Integer vehPaymentType;
    private String vehPayDate;
    private String vehUtrNo;
    private Double freightAmount;
    private Double paid;
    private Double cashPaid;
    private Double bankPaid;
    private Double balance;
    private Double currentBalance;
    private Integer paymentMode;
    private Integer paymentType;
    private Integer isAllotted;
    private Integer isUnloaded;
    private String billImage;
    private Long uid;
    private String userName;
    private String date;
    private String time;
}
