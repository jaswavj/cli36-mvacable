package com.billing.transport.dto;

import lombok.Data;

@Data
public class CollectTransportRequest {
    private String vehicleNo;
    private String driverNo;
    private String ownerNo;
    private Double vehFreight;
    private Double cashPaid;
    private Double bankPaid;
    private Double balance;
    private Integer mode;
    private Integer type;
    private String payDate;
    private String utrNo;
}
