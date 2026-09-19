package com.billing.admin.dto;

import lombok.Data;

import java.util.List;

@Data
public class AdminBillListData {
    private List<AdminBillRow> bills;
    private List<AdminDueRow> dues;
}
