package com.billing.master.dto;

import lombok.Data;

import java.util.List;

@Data
public class MasterLookupsData {
    private HeadingData headings;
    private List<NamedItemData> categories;
    private List<NamedItemData> brands;
    private List<UnitData> units;
    private List<ProductOptionData> products;
}
