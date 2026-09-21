package com.billing.collection.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CollectionReportData {
    private List<CollectionReportRow> rows = new ArrayList<>();
    private Integer count;
    private Integer page;
    private Integer size;
    private Double totalAmount;
    private Double cashTotal;
    private Double upiTotal;
    private Double cableTotal;
    private Double wifiTotal;
}
