package com.billing.admin.dto;

import lombok.Data;

import java.util.List;

@Data
public class ExchangeBillData {
    private Long billId;
    private String billNo;
    private Long customerId;
    private String cusName;
    private String total;
    private String payable;
    private String paid;
    private String billDate;
    private List<ExchangeItemData> items;
}
