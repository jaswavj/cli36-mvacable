package com.billing.collection.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class CollectionMonthData {
    private String month;
    private String label;
    @JsonProperty("paid")
    private Boolean paid;
    @JsonProperty("recharged")
    private Boolean recharged;
    private String paidDate;
    private String paidDateIso;
    private String rechargeDate;
    private String payMode;
    private Double due;
    private Double paidAmount;
    private Double balance;
    private Double amount;
}
