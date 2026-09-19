package com.billing.pos.dto;

import lombok.Data;

@Data
public class PrintDispatchData {
    private String type;
    private String billNo;
    private String printerName;
    private String rawBase64;
    private String plainText;
    private String message;
    private String txtFile;
    private String txtPath;
}
