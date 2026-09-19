package com.billing.pos.dto;

import lombok.Data;

import java.util.List;

@Data
public class SaveBillRequest {
    private String customerName;
    private String customerPhn;
    private Long customerId;
    private Integer isEligibleForCommission;
    private Integer priceCategory = 3;
    private Long attenderId;
    private Integer isTaxBill = 1;
    private Double finalDiscount;
    private Double payableAmount;
    private Double grandTotal;
    private Double priceTotal;
    private Double discountTotal;
    private Double cashPaid;
    private Double bankPaid;
    private Integer mode;
    private Integer type;
    private Double balance;
    private Long quotationId;
    private Double exchangePointUsed;
    private List<BillLineRequest> products;
}
