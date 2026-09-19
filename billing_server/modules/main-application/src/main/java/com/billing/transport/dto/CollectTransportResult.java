package com.billing.transport.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CollectTransportResult {
    private String trNo;
    private Double paid;
    private Double currentBalance;
    private Integer isAllotted;
}
