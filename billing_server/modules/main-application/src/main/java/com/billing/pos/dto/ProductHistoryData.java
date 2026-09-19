package com.billing.pos.dto;

import lombok.Data;

@Data
public class ProductHistoryData {
    private String billNo;
    private String date;
    private String time;
    private Double qty;
    private Double price;
    private Double discount;
    private Double total;
    private String customerName;
}
