package com.billing.transport.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class TransportDashboardData {
    private Integer year;
    private Integer month;
    private String label;
    private Integer bills;
    private Integer todayBills;
    private Double todayFreight;
    private Double agentFreight;
    private Double lastAgentFreight;
    private Double agentPct;
    private Double agentPaid;
    private Double agentDue;
    private Double vehFreight;
    private Double lastVehFreight;
    private Double vehPct;
    private Double vehPaid;
    private Double vehDue;
    private Double margin;
    private Double lastMargin;
    private Double marginPct;
    private Integer pendingAllotments;
    private Integer allotted;
    private Integer unloaded;
    private Integer inTransit;
    private List<TransportDashboardDay> daily = new ArrayList<>();
}
