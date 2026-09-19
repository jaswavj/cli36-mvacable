package com.billing.collection.dto;

import lombok.Data;

@Data
public class CollectionLogRow {
    private Long id;
    private Long collectionId;
    private String action;
    private String customerId;
    private String customerName;
    private String monthLabel;
    private Double oldAmount;
    private Double newAmount;
    private String oldPayMode;
    private String newPayMode;
    private String oldPaidDate;
    private String newPaidDate;
    private String reason;
    private String userName;
    private String logDate;
    private String logTime;
}
