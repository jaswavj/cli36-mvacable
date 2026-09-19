package com.billing.pos.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class PrintBillData {
    private Long billId;
    private String billDisplay;
    private String customerName;
    private String customerPhone;
    private String customerAddress;
    private String customerGstin;
    private String date;
    private String time;
    private Double priceTotal;
    private Double productDiscount;
    private Double extraDiscount;
    private Double payable;
    private Double paid;
    private Double balance;
    private Double cashPaid;
    private Double bankPaid;
    private Integer paymentMode;
    private Integer paymentType;
    private Integer isTaxBill;
    private Integer printType;
    private String printerName;
    private String companyName;
    private String companyAddress;
    private String companyGstin;
    private String companyBankDetails;
    private String amountInWords;
    private List<PrintLineData> items = new ArrayList<>();
    private List<PrintPaymentRow> payments = new ArrayList<>();

    @Data
    public static class PrintLineData {
        private String code;
        private String name;
        private String categoryName;
        private String hsn;
        private String unitName;
        private Double qty;
        private Double price;
        private Double discount;
        private Double total;
        private Integer gst;
    }

    @Data
    public static class PrintPaymentRow {
        private String date;
        private String mode;
        private String method;
        private Double paid;
        private Double balance;
    }
}
