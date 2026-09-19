package com.billing.pos.dto;

import lombok.Data;

import java.util.List;

@Data
public class HoldBillRequest {
    private String customerName;
    private String customerPhn;
    private Long customerId;
    private Double finalDiscount;
    private Double payableAmount;
    private Double priceTotal;
    private Double discountTotal;
    private Integer isTaxBill = 1;
    private List<BillLineRequest> products;
}
