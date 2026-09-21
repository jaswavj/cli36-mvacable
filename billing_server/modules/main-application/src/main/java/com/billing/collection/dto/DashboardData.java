package com.billing.collection.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class DashboardData {
    private Integer year;
    private Integer month;
    private String from;
    private String to;
    private String label;
    private Double collectionTotal;
    private Double lastCollectionTotal;
    private Double collectionPct;
    private Double cashTotal;
    private Double upiTotal;
    private Double cableTotal;
    private Double wifiTotal;
    private Integer collectionCount;
    private Double expenseTotal;
    private Double lastExpenseTotal;
    private Double expensePct;
    private Integer expenseCount;
    private Double finalAmount;
    private Double lastFinalAmount;
    private Double finalPct;
    private Double todayCollection;
    private Integer todayCount;
    private Integer activeCustomers;
    private Integer cableCustomers;
    private Integer wifiCustomers;
    private Integer pendingCustomers;
    private Double pendingAmount;
    private Integer newConnections;
    private Integer disconnections;
    private Double expectedAmount;
    private Double monthDueCollected;
    private List<DashboardDay> daily = new ArrayList<>();
    private List<DashboardCollector> collectors = new ArrayList<>();
}
