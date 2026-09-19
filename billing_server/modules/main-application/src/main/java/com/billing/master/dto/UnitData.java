package com.billing.master.dto;

import lombok.Data;

@Data
public class UnitData {
    private Long id;
    private String name;
    private String convertionUnit;
    private Double convertionCalculation;
    private Integer isActive;
}
