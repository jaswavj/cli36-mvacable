package com.billing.admin.dto;

import lombok.Data;

@Data
public class ExchangeReportRow {
    private Long id;
    private String dateTime;
    private String billNo;
    private String customer;
    private String oldProd;
    private String newProd;
    private Integer type;
    private Double points;
    private String staff;
}
