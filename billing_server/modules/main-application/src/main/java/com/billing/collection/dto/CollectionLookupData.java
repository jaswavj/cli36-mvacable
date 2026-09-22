package com.billing.collection.dto;

import com.billing.customer.dto.CableCustomerRow;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CollectionLookupData {
    private CableCustomerRow customer;
    @JsonProperty("needsRecharge")
    private Boolean needsRecharge;
    private List<CollectionMonthData> pendingMonths = new ArrayList<>();
    private CollectionMonthData currentMonth;
    private List<CollectionPaymentRow> payments = new ArrayList<>();
    private Long lastPaymentId;
    private Double lastAmount;
}
