package com.billing.collection.dto;

import lombok.Data;

@Data
public class CollectionReceiptData {
    private Long id;
    private String receiptNo;
    private Integer printType;
    private String printerName;
    private String companyName;
    private String companyAddress;
    private String companyGstin;
    private String companyBankDetails;
    private String customerType;
    private String customerId;
    private String customerName;
    private String mobile;
    private String address;
    private String area;
    private String joiningDate;
    private String month;
    private String monthLabel;
    private Double amount;
    private String payMode;
    private String paidDate;
    private String paidTime;
    private Double due;
    private Double paidAmount;
    private Double balance;
    private String collectedBy;
    private String amountInWords;
}
