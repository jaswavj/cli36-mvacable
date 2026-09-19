package com.billing.transport.dto;

import lombok.Data;

@Data
public class TransportDashboardDay {
    private String date;
    private Double freight;
    private Double vehFreight;
}
