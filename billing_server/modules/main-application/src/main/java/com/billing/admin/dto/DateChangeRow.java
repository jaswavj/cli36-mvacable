package com.billing.admin.dto;

import lombok.Data;

@Data
public class DateChangeRow {
    private Long billId;
    private String billNo;
    private String oldDate;
    private String newDate;
    private String changeDate;
    private String changeTime;
    private String userName;
}
