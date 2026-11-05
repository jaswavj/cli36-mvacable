package com.billing.collection;

import com.billing.admin.AdminService;
import com.billing.admin.dto.CompanyDetailsData;
import com.billing.collection.dto.CollectionReceiptData;
import com.billing.data.AppUser;
import com.billing.pos.AmountInWords;
import com.billing.pos.WinspoolRawPrinter;
import com.billing.pos.dto.PrintDispatchData;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.print.Doc;
import javax.print.DocFlavor;
import javax.print.PrintService;
import javax.print.PrintServiceLookup;
import javax.print.SimpleDoc;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileWriter;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.text.DecimalFormat;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class CollectionPrintService {

    private static final byte[] INIT = {0x1B, 0x40};
    private static final byte[] BOLD_ON = {0x1B, 0x45, 0x01};
    private static final byte[] BOLD_OFF = {0x1B, 0x45, 0x00};
    private static final byte[] ALIGN_CENTER = {0x1B, 0x61, 0x01};
    private static final byte[] ALIGN_LEFT = {0x1B, 0x61, 0x00};
    private static final byte[] FONT_NORMAL = {0x1B, 0x21, 0x00};
    private static final byte[] FONT_A = {0x1B, 0x4D, 0x00};
    private static final byte[] FEED_4_LINES = {0x1B, 0x64, 0x04};
    private static final byte[] CUT_PARTIAL = {0x1D, 0x56, 0x01};
    private static final byte[] CUT_FEED = {0x1D, 0x56, 0x41, 0x03};
    private static final int WIDTH_58 = 32;
    private static final int WIDTH_80 = 48;
    private static final DecimalFormat DF = new DecimalFormat("0.00");
    private final JdbcTemplate jdbcTemplate;
    private final AdminService adminService;

    public PrintDispatchData dispatch(Long paymentId, AppUser user) {
        CollectionReceiptData receipt = receipt(paymentId, user);
        int printType = receipt.getPrintType() == null ? 1 : receipt.getPrintType();
        if (printType == 2) {
            PrintDispatchData data = new PrintDispatchData();
            data.setType("a4");
            data.setBillNo(receipt.getReceiptNo());
            data.setMessage("Opening A4 print preview");
            return data;
        }
        return printReceipt(paymentId, user);
    }

    public CollectionReceiptData receipt(Long paymentId, AppUser user) {
        if (user == null || user.getId() == null) {
            throw new RuntimeException("Please login again");
        }
        String shopId = user.shopId();
        if (shopId == null || shopId.isBlank()) {
            throw new RuntimeException("Shop ID is missing from session");
        }
        if (paymentId == null || paymentId <= 0) {
            throw new RuntimeException("Collection receipt not found");
        }
        List<CollectionReceiptData> rows = jdbcTemplate.query(
                "SELECT c.id, c.customer_id, c.customer_pk, c.collection_month, c.amount, IFNULL(c.due_amount, 0) AS due_amount, " +
                        "c.pay_mode, c.paid_date, DATE_FORMAT(c.paid_date, '%d/%m/%Y') AS paidDate, " +
                        "TIME_FORMAT(c.paid_time, '%h:%i %p') AS paidTime, " +
                        "IFNULL(cu.name,'') AS customerName, IFNULL(cu.customer_type,'') AS customerType, " +
                        "IFNULL(cu.mobile,'') AS mobile, IFNULL(cu.address,'') AS address, IFNULL(cu.area,'') AS area, " +
                        "IFNULL(cu.monthly_amount,0) AS monthlyAmount, " +
                        "DATE_FORMAT(cu.joining_date, '%d-%m-%Y') AS joiningDate, " +
                        "IFNULL(NULLIF(u.fullName,''), u.user_name) AS collectedBy " +
                        "FROM cable_collections c " +
                        "LEFT JOIN cable_customers cu ON cu.id = c.customer_pk " +
                        "LEFT JOIN users u ON u.id = c.uid " +
                        "WHERE c.id = ? AND c.shop_id = ? AND IFNULL(c.is_cancelled,0) = 0 LIMIT 1",
                (rs, i) -> {
                    CollectionReceiptData data = new CollectionReceiptData();
                    data.setId(rs.getLong("id"));
                    data.setCustomerId(rs.getString("customer_id"));
                    YearMonth month = YearMonth.from(rs.getDate("collection_month").toLocalDate());
                    data.setMonth(month.atDay(1).toString());
                    data.setMonthLabel(month.format(DateTimeFormatter.ofPattern("MMM", Locale.ENGLISH)).toUpperCase());
                    data.setAmount(round2(rs.getDouble("amount")));
                    data.setDue(round2(rs.getDouble("due_amount")));
                    data.setPayMode(rs.getString("pay_mode"));
                    data.setPaidDate(rs.getString("paidDate"));
                    data.setPaidTime(rs.getString("paidTime"));
                    data.setCollectedBy(rs.getString("collectedBy"));
                    data.setCustomerType(rs.getString("customerType"));
                    data.setCustomerName(rs.getString("customerName"));
                    data.setMobile(rs.getString("mobile"));
                    data.setAddress(rs.getString("address"));
                    data.setArea(rs.getString("area"));
                    data.setJoiningDate(rs.getString("joiningDate"));
                    long customerPk = rs.getLong("customer_pk");
                    data.setCustomerPk(rs.wasNull() ? null : customerPk);
                    java.sql.Date paidDate = rs.getDate("paid_date");
                    data.setPaidDateIso(paidDate == null ? null : paidDate.toString());
                    data.setPaidAmount(rs.getDouble("monthlyAmount"));
                    return data;
                },
                paymentId,
                shopId
        );
        if (rows.isEmpty()) {
            throw new RuntimeException("Collection receipt not found");
        }
        CollectionReceiptData data = rows.get(0);
        CompanyDetailsData company = adminService.company();
        Long customerPk = data.getCustomerPk();
        java.sql.Date paidDate = data.getPaidDateIso() == null ? null : java.sql.Date.valueOf(data.getPaidDateIso());
        double monthly = data.getPaidAmount() == null ? 0 : data.getPaidAmount();
        Double paidTotal = customerPk == null ? 0d : jdbcTemplate.queryForObject(
                "SELECT IFNULL(SUM(amount), 0) FROM cable_collections WHERE shop_id = ? AND customer_pk = ? AND collection_month = ? AND IFNULL(is_cancelled,0) = 0",
                Double.class,
                shopId,
                customerPk,
                java.sql.Date.valueOf(java.time.LocalDate.parse(data.getMonth()))
        );
        Integer billNo = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM cable_collections WHERE shop_id = ? AND paid_date = ? AND IFNULL(is_cancelled,0) = 0 AND id <= ?",
                Integer.class,
                shopId,
                paidDate,
                paymentId
        );
        double due = data.getDue() != null && data.getDue() > 0 ? data.getDue() : monthly;
        double paid = paidTotal == null ? 0 : paidTotal;
        data.setReceiptNo(String.format("%03d", billNo == null || billNo < 1 ? 1 : billNo));
        data.setPrintType(company.getPrintType() == null ? 1 : company.getPrintType());
        data.setPrinterName(nz(company.getPrinterName()));
        data.setCompanyName(nz(company.getShopName()));
        data.setCompanyAddress(nz(company.getAddress()));
        data.setCompanyGstin(nz(company.getGstin()));
        data.setCompanyBankDetails(nz(company.getBankDetails()));
        data.setDue(round2(due));
        data.setPaidAmount(round2(paid));
        data.setBalance(Math.max(0, round2(due - paid)));
        data.setAmountInWords(AmountInWords.from(data.getAmount() == null ? 0 : data.getAmount()));
        return data;
    }

    public PrintDispatchData printReceipt(Long paymentId, AppUser user) {
        CollectionReceiptData receipt = receipt(paymentId, user);
        CompanyDetailsData company = adminService.company();
        String printerName = firstName(receipt.getPrinterName(), company.getPrinterName());
        int width = receiptWidth(company, printerName);
        byte[] bytes = buildReceipt(receipt, width);
        int thermalPrintType = company.getThermalPrintType() == null ? 2 : company.getThermalPrintType();
        if (thermalPrintType == 2) {
            if (printerName.isBlank()) {
                throw new RuntimeException("Printer name not found.");
            }
            String payload = Base64.getEncoder().encodeToString(bytes);
            PrintDispatchData data = new PrintDispatchData();
            data.setType("local");
            data.setBillNo(receipt.getReceiptNo());
            data.setPrinterName(printerName);
            data.setPayload(payload);
            data.setRawBase64(payload);
            data.setMessage("Send to print agent on this PC. Keep start-print-agent.bat open.");
            return data;
        }
        if (printerName.isBlank()) {
            saveBillTxtOnError(company, receipt, width);
            throw new RuntimeException("Printer name not found.");
        }
        PrintService service = findPrintService(printerName);
        String localName = service != null ? service.getName() : printerName;
        if (!printOnThisMachine(localName, printerName, bytes)) {
            saveBillTxtOnError(company, receipt, width);
            throw new RuntimeException("Printer name not found.");
        }
        PrintDispatchData data = new PrintDispatchData();
        data.setType("printed");
        data.setBillNo(receipt.getReceiptNo());
        data.setPrinterName(localName);
        data.setMessage("Printed to: " + localName);
        return data;
    }

    private byte[] buildReceipt(CollectionReceiptData receipt, int width) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        write(out, INIT);
        write(out, FONT_NORMAL);
        write(out, FONT_A);
        write(out, ALIGN_CENTER);
        write(out, BOLD_ON);
        writeCentered(out, nz(receipt.getCompanyName()), width);
        write(out, BOLD_OFF);
        writeAddress(out, receipt.getCompanyAddress(), width);
        write(out, ALIGN_LEFT);
        write(out, divider(width));
        write(out, kv("NAME :", nz(receipt.getCustomerName()), width));
        write(out, kv("Customer ID :", nz(receipt.getCustomerId()), width));
        write(out, divider(width));
        write(out, kv("BILL NO:", nz(receipt.getReceiptNo()), width));
        write(out, kv("Date", nz(receipt.getPaidDate()), width));
        write(out, kv("MONTH", nz(receipt.getMonthLabel()), width));
        write(out, kv("TIME IN", nz(receipt.getPaidTime()), width));
        write(out, divider(width));
        write(out, BOLD_ON);
        write(out, kv("AMOUNT", money(receipt.getAmount()), width));
        write(out, kv("PAID", payLabel(receipt.getPayMode()), width));
        write(out, BOLD_OFF);
        write(out, ALIGN_CENTER);
        write(out, "Welcome\n");
        write(out, FEED_4_LINES);
        write(out, CUT_FEED);
        write(out, CUT_PARTIAL);
        return out.toByteArray();
    }

    private void saveBillTxtOnError(CompanyDetailsData company, CollectionReceiptData receipt, int width) {
        if (company.getThermalTxtFile() == null || company.getThermalTxtFile() != 1) {
            return;
        }
        try {
            writeTxt(receipt, width);
        } catch (Exception ignored) {
            // keep the printer error as the main failure
        }
    }

    private String writeTxt(CollectionReceiptData receipt, int width) throws Exception {
        File dir = new File(System.getProperty("user.dir"), "bills");
        if (!dir.exists()) {
            dir.mkdirs();
        }
        File file = new File(dir, "Collection_" + receipt.getReceiptNo() + ".txt");
        try (FileWriter writer = new FileWriter(file, StandardCharsets.UTF_8)) {
            writer.write(buildPlainText(receipt, width));
        }
        return file.getAbsolutePath();
    }

    private String buildPlainText(CollectionReceiptData receipt, int width) {
        StringBuilder sb = new StringBuilder();
        sb.append(center(nz(receipt.getCompanyName()), width)).append('\n');
        if (!blank(receipt.getCompanyAddress())) {
            for (String line : receipt.getCompanyAddress().split("\\r?\\n")) {
                if (!blank(line)) {
                    sb.append(center(formatAddressLine(line.trim()), width)).append('\n');
                }
            }
        }
        sb.append(divider(width));
        sb.append(kv("NAME :", nz(receipt.getCustomerName()), width));
        sb.append(kv("Customer ID :", nz(receipt.getCustomerId()), width));
        sb.append(divider(width));
        sb.append(kv("BILL NO:", nz(receipt.getReceiptNo()), width));
        sb.append(kv("Date", nz(receipt.getPaidDate()), width));
        sb.append(kv("MONTH", nz(receipt.getMonthLabel()), width));
        sb.append(kv("TIME IN", nz(receipt.getPaidTime()), width));
        sb.append(divider(width));
        sb.append(kv("AMOUNT", money(receipt.getAmount()), width));
        sb.append(kv("PAID", payLabel(receipt.getPayMode()), width));
        sb.append(center("Welcome", width)).append("\n\n");
        return sb.toString();
    }

    private int receiptWidth(CompanyDetailsData company, String printerName) {
        int paperMm = company.getThermalPaperMm() == null ? 0 : company.getThermalPaperMm();
        if (paperMm == 80) {
            return WIDTH_80;
        }
        if (paperMm == 58) {
            return WIDTH_58;
        }
        String name = printerName == null ? "" : printerName.toLowerCase();
        if (name.contains("80") && !name.contains("58")) {
            return WIDTH_80;
        }
        return WIDTH_58;
    }

    private String firstName(String... names) {
        if (names == null) {
            return "";
        }
        for (String name : names) {
            if (name != null && !name.isBlank()) {
                return name.trim();
            }
        }
        return "";
    }

    private boolean printOnThisMachine(String resolvedName, String configuredName, byte[] receipt) {
        if (WinspoolRawPrinter.print(resolvedName, receipt)) {
            return true;
        }
        return configuredName != null
                && !configuredName.equalsIgnoreCase(resolvedName)
                && WinspoolRawPrinter.print(configuredName, receipt);
    }

    private boolean sendRaw(String printerName, byte[] data) {
        String[] paths = {
                "\\\\localhost\\" + printerName,
                "\\\\.\\" + printerName
        };
        for (String path : paths) {
            try (java.io.FileOutputStream fos = new java.io.FileOutputStream(path)) {
                fos.write(data);
                fos.flush();
                return true;
            } catch (Exception ignored) {
                // try next path
            }
        }
        try {
            Doc doc = new SimpleDoc(data, DocFlavor.BYTE_ARRAY.AUTOSENSE, null);
            PrintService service = findPrintService(printerName);
            if (service == null) {
                return false;
            }
            service.createPrintJob().print(doc, null);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    private PrintService findPrintService(String printerName) {
        if (printerName == null || printerName.isBlank()) {
            return null;
        }
        PrintService[] services = PrintServiceLookup.lookupPrintServices(null, null);
        for (PrintService service : services) {
            if (service.getName().toLowerCase().contains(printerName.toLowerCase())) {
                return service;
            }
        }
        return null;
    }

    private void writeAddress(ByteArrayOutputStream out, String address, int width) {
        if (blank(address)) {
            return;
        }
        for (String line : address.split("\\r?\\n")) {
            if (!blank(line)) {
                writeCentered(out, formatAddressLine(line.trim()), width);
            }
        }
    }

    private void writeCentered(ByteArrayOutputStream out, String text, int width) {
        String value = text == null ? "" : text.trim();
        while (value.length() > width) {
            write(out, value.substring(0, width) + "\n");
            value = value.substring(width).trim();
        }
        write(out, value + "\n");
    }

    private String kv(String label, String value, int width) {
        String left = label == null ? "" : label;
        String right = value == null ? "" : value.trim();
        if (left.length() > width) {
            left = left.substring(0, width);
        }
        if (right.length() > width) {
            return left + "\n" + wrapRight(right, width);
        }
        if (left.length() + (right.isEmpty() ? 0 : 1) + right.length() > width) {
            return left + "\n" + padLeft(right, width) + "\n";
        }
        return padRight(left, width - right.length()) + right + "\n";
    }

    private String wrapRight(String value, int width) {
        StringBuilder sb = new StringBuilder();
        String rest = value;
        while (rest.length() > width) {
            sb.append(rest, 0, width).append('\n');
            rest = rest.substring(width).trim();
        }
        sb.append(padLeft(rest, width)).append('\n');
        return sb.toString();
    }

    private String formatAddressLine(String line) {
        String trimmed = line.trim();
        String digits = trimmed.replaceAll("[^0-9]", "");
        if (digits.length() >= 8 && digits.length() <= 15 && !trimmed.toLowerCase().contains("phone")) {
            return "Phone: " + trimmed;
        }
        return trimmed;
    }

    private String money(Double value) {
        double amount = n(value);
        if (Math.abs(amount - Math.round(amount)) < 0.005) {
            return String.valueOf(Math.round(amount));
        }
        return DF.format(amount);
    }

    private String padLeft(String s, int width) {
        if (s == null) s = "";
        if (s.length() >= width) return s.substring(0, width);
        return " ".repeat(width - s.length()) + s;
    }

    private String formatTotal(String label, String value, int width) {
        int padding = Math.max(1, width - label.length() - value.length());
        return label + " ".repeat(padding) + value + "\n";
    }

    private String divider(int width) {
        return "-".repeat(width) + "\n";
    }

    private String padRight(String s, int width) {
        if (s == null) s = "";
        if (s.length() >= width) return s.substring(0, width);
        return s + " ".repeat(width - s.length());
    }

    private String center(String text, int width) {
        if (text == null) text = "";
        if (text.length() >= width) return text.substring(0, width);
        int left = (width - text.length()) / 2;
        return " ".repeat(left) + text + " ".repeat(width - text.length() - left);
    }

    private void write(ByteArrayOutputStream out, byte[] data) {
        out.writeBytes(data);
    }

    private void write(ByteArrayOutputStream out, String text) {
        out.writeBytes(text.getBytes(StandardCharsets.UTF_8));
    }

    private String typeLabel(String type) {
        return "wifi".equalsIgnoreCase(type) ? "WiFi" : "Cable";
    }

    private String payLabel(String mode) {
        if (mode == null || mode.isBlank()) {
            return "CASH";
        }
        String value = mode.trim().toLowerCase();
        if ("upi".equals(value) || value.contains("gpay") || value.contains("g-pay") || value.contains("google")) {
            return "GPAY";
        }
        return "CASH";
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private String nz(String value) {
        return value == null ? "" : value;
    }

    private double n(Double value) {
        return value == null ? 0 : value;
    }

    private double nz(Double value) {
        return value == null ? 0 : value;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
