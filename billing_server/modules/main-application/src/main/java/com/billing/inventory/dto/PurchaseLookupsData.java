package com.billing.inventory.dto;

import com.billing.master.dto.NamedItemData;
import lombok.Data;

import java.util.List;

@Data
public class PurchaseLookupsData {
    private List<SupplierData> suppliers;
    private List<NamedItemData> paymentTypes;
    private List<NamedItemData> banks;
}
