package com.billing.credit.dto;

import lombok.Data;

import java.util.List;

@Data
public class CreditAccountData {
    private Long id;
    private String name;
    private String phone;
    private Double advance;
    private Double balance;
    private Integer count;
    private List<TimelineRow> timeline;
}
