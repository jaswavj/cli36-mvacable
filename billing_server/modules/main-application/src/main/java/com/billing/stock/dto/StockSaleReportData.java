package com.billing.stock.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class StockSaleReportData {
    private List<StockSaleRow> rows = new ArrayList<>();
    private Integer count;
    private Double totalQty;
    private Double totalAmount;
}