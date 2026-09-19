package com.billing.admin.dto;

import lombok.Data;

import java.util.List;

@Data
public class AdminBillDetailData {
    private Long id;
    private String billNo;
    private String date;
    private Double total;
    private Double prodDisc;
    private Double extraDisc;
    private Double payable;
    private Double paid;
    private Double cash;
    private Double bank;
    private Double balance;
    private Double currentBalance;
    private String cancelBlockMsg;
    private List<AdminBillLine> lines;
}
