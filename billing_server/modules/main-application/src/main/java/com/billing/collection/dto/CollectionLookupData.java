package com.billing.collection.dto;

import com.billing.customer.dto.CableCustomerRow;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CollectionLookupData {
    private CableCustomerRow customer;
    private List<CollectionMonthData> pendingMonths = new ArrayList<>();
    private CollectionMonthData currentMonth;
    private List<CollectionPaymentRow> payments = new ArrayList<>();
    private Long lastPaymentId;
    private Double lastAmount;
}
