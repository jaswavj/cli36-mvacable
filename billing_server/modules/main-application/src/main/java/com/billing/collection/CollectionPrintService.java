package com.billing.collection;

import com.billing.admin.AdminService;
import com.billing.admin.dto.CompanyDetailsData;
import com.billing.collection.dto.CollectionReceiptData;
import com.billing.customer.CableCustomerService;
import com.billing.customer.dto.CableCustomerRow;
import com.billing.data.AppUser;
import com.billing.pos.AmountInWords;
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
    private static final DateTimeFormatter MONTH_LABEL = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH);

    private final JdbcTemplate jdbcTemplate;
    private final AdminService adminService;
    private final CableCustomerService cableCustomerService;

    public PrintDispatchData dispatch(Long paymentId, AppUser user) {
        CollectionReceiptData receipt = receipt(paymentId, user);
        PrintDispatchData data = new PrintDispatchData();
        data.setBillNo(receipt.getReceiptNo());
        data.setPrinterName(receipt.getPrinterName());
        int printType = receipt.getPrintType() == null ? 1 : receipt.getPrintType();
        if (printType == 2) {
            data.setType("a4");
            data.setMessage("Opening A4 print preview");
            return data;
        }
        int width = receiptWidth(receipt.getPrinterName());
        data.setType("thermal");
        data.setRawBase64(Base64.getEncoder().encodeToString(buildReceipt(receipt, width)));
        data.setPlainText(buildPlainText(receipt, width));
        data.setMessage("Print on client printer: " + (receipt.getPrinterName() == null ? "" : receipt.getPrinterName()));
        return data;
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
                "SELECT c.id, c.customer_id, c.collection_month, c.amount, IFNULL(c.due_amount, 0) AS due_amount, " +
                        "c.pay_mode, DATE_FORMAT(c.paid_date, '%d-%m-%Y') AS paidDate, " +
                        "TIME_FORMAT(c.paid_time, '%h:%i %p') AS paidTime, " +
                        "IFNULL(NULLIF(u.fullName,''), u.user_name) AS collectedBy " +
                        "FROM cable_collections c LEFT JOIN users u ON u.id = c.uid " +
                        "WHERE c.id = ? AND c.shop_id = ? AND IFNULL(c.is_cancelled,0) = 0 LIMIT 1",
                (rs, i) -> {
                    CollectionReceiptData data = new CollectionReceiptData();
                    data.setId(rs.getLong("id"));
                    data.setCustomerId(rs.getString("customer_id"));
                    YearMonth month = YearMonth.from(rs.getDate("collection_month").toLocalDate());
                    data.setMonth(month.atDay(1).toString());
                    data.setMonthLabel(month.format(MONTH_LABEL));
                    data.setAmount(round2(rs.getDouble("amount")));
                    data.setDue(round2(rs.getDouble("due_amount")));
                    data.setPayMode(rs.getString("pay_mode"));
                    data.setPaidDate(rs.getString("paidDate"));
                    data.setPaidTime(rs.getString("paidTime"));
                    data.setCollectedBy(rs.getString("collectedBy"));
                    return data;
                },
                paymentId,
                shopId
        );
        if (rows.isEmpty()) {
            throw new RuntimeException("Collection receipt not found");
        }
        CollectionReceiptData data = rows.get(0);
        CableCustomerRow customer = cableCustomerService.findActiveByCustomerId(user, data.getCustomerId());
        CompanyDetailsData company = adminService.company();
        Double paidTotal = jdbcTemplate.queryForObject(
                "SELECT IFNULL(SUM(amount), 0) FROM cable_collections WHERE shop_id = ? AND customer_pk = ? AND collection_month = ? AND IFNULL(is_cancelled,0) = 0",
                Double.class,
                shopId,
                customer.getId(),
                java.sql.Date.valueOf(java.time.LocalDate.parse(data.getMonth()))
        );
        double due = data.getDue() != null && data.getDue() > 0 ? data.getDue() : nz(customer.getMonthlyAmount());
        double paid = paidTotal == null ? 0 : paidTotal;
        data.setReceiptNo("COL-" + data.getId());
        data.setPrintType(company.getPrintType() == null ? 1 : company.getPrintType());
        data.setPrinterName(nz(company.getPrinterName()));
        data.setCompanyName(nz(company.getShopName()));
        data.setCompanyAddress(nz(company.getAddress()));
        data.setCompanyGstin(nz(company.getGstin()));
        data.setCompanyBankDetails(nz(company.getBankDetails()));
        data.setCustomerType(customer.getCustomerType());
        data.setCustomerName(customer.getName());
        data.setMobile(customer.getMobile());
        data.setAddress(customer.getAddress());
        data.setArea(customer.getArea());
        data.setJoiningDate(customer.getJoiningDate());
        data.setDue(round2(due));
        data.setPaidAmount(round2(paid));
        data.setBalance(Math.max(0, round2(due - paid)));
        data.setAmountInWords(AmountInWords.from(data.getAmount() == null ? 0 : data.getAmount()));
        return data;
    }

    public PrintDispatchData printReceipt(Long paymentId, AppUser user) {
        CollectionReceiptData receipt = receipt(paymentId, user);
        int width = receiptWidth(receipt.getPrinterName());
        PrintService service = findPrintService(receipt.getPrinterName());
        if (service != null) {
            try {
                byte[] bytes = buildReceipt(receipt, width);
                if (!sendRaw(service.getName(), bytes)) {
                    throw new RuntimeException("Could not send raw data to " + service.getName());
                }
                PrintDispatchData data = new PrintDispatchData();
                data.setType("printed");
                data.setBillNo(receipt.getReceiptNo());
                data.setMessage("Printed to: " + service.getName());
                return data;
            } catch (Exception ex) {
                throw new RuntimeException("Print error: " + (ex.getMessage() == null ? "Unknown error" : ex.getMessage()));
            }
        }
        try {
            String txtPath = writeTxt(receipt, width);
            File file = new File(txtPath);
            PrintDispatchData data = new PrintDispatchData();
            data.setType("txt");
            data.setBillNo(receipt.getReceiptNo());
            data.setTxtPath(txtPath.replace('\\', '/'));
            data.setTxtFile(file.getName());
            data.setMessage("No printer found. TXT saved to: " + data.getTxtPath());
            return data;
        } catch (Exception ex) {
            throw new RuntimeException("Could not save receipt: " + ex.getMessage());
        }
    }

    private byte[] buildReceipt(CollectionReceiptData receipt, int width) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        write(out, INIT);
        write(out, FONT_NORMAL);
        write(out, FONT_A);
        write(out, ALIGN_CENTER);
        write(out, BOLD_ON);
        write(out, nz(receipt.getCompanyName()) + "\n");
        write(out, BOLD_OFF);
        writeAddress(out, receipt.getCompanyAddress());
        if (!blank(receipt.getCompanyGstin())) {
            write(out, "GSTIN: " + receipt.getCompanyGstin() + "\n");
        }
        write(out, divider(width));
        write(out, BOLD_ON);
        write(out, "COLLECTION RECEIPT\n");
        write(out, BOLD_OFF);
        write(out, divider(width));
        write(out, ALIGN_LEFT);
        String date = nz(receipt.getPaidDate());
        write(out, padRight("Rcpt: " + nz(receipt.getReceiptNo()), width - date.length()) + date + "\n");
        if (!blank(receipt.getPaidTime())) {
            write(out, "Time: " + receipt.getPaidTime() + "\n");
        }
        write(out, "Cust: " + nz(receipt.getCustomerName()) + "\n");
        write(out, "ID: " + nz(receipt.getCustomerId()) + "\n");
        write(out, "Type: " + typeLabel(receipt.getCustomerType()) + "\n");
        if (!blank(receipt.getMobile())) {
            write(out, "Ph: " + receipt.getMobile() + "\n");
        }
        if (!blank(receipt.getArea())) {
            write(out, "Area: " + receipt.getArea() + "\n");
        }
        write(out, divider(width));
        write(out, "Month: " + nz(receipt.getMonthLabel()) + "\n");
        write(out, "Mode: " + payLabel(receipt.getPayMode()) + "\n");
        write(out, divider(width));
        write(out, formatTotal("Due:", "Rs " + DF.format(n(receipt.getDue())), width));
        write(out, BOLD_ON);
        write(out, formatTotal("Paid now:", "Rs " + DF.format(n(receipt.getAmount())), width));
        write(out, BOLD_OFF);
        write(out, formatTotal("Total paid:", "Rs " + DF.format(n(receipt.getPaidAmount())), width));
        write(out, formatTotal("Balance:", "Rs " + DF.format(n(receipt.getBalance())), width));
        write(out, divider(width));
        write(out, ALIGN_CENTER);
        write(out, nz(receipt.getAmountInWords()).toUpperCase() + "\n");
        if (!blank(receipt.getCollectedBy())) {
            write(out, "Collected by: " + receipt.getCollectedBy() + "\n");
        }
        write(out, "Thank You\n");
        write(out, FEED_4_LINES);
        write(out, CUT_FEED);
        write(out, CUT_PARTIAL);
        return out.toByteArray();
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
                    sb.append(center(line.trim(), width)).append('\n');
                }
            }
        }
        if (!blank(receipt.getCompanyGstin())) {
            sb.append(center("GSTIN: " + receipt.getCompanyGstin(), width)).append('\n');
        }
        sb.append(divider(width));
        sb.append(center("COLLECTION RECEIPT", width)).append('\n');
        sb.append(divider(width));
        String date = nz(receipt.getPaidDate());
        sb.append(padRight("Rcpt: " + nz(receipt.getReceiptNo()), width - date.length())).append(date).append('\n');
        sb.append("Cust: ").append(nz(receipt.getCustomerName())).append('\n');
        sb.append("ID: ").append(nz(receipt.getCustomerId())).append('\n');
        sb.append("Type: ").append(typeLabel(receipt.getCustomerType())).append('\n');
        if (!blank(receipt.getMobile())) {
            sb.append("Ph: ").append(receipt.getMobile()).append('\n');
        }
        if (!blank(receipt.getArea())) {
            sb.append("Area: ").append(receipt.getArea()).append('\n');
        }
        sb.append(divider(width));
        sb.append("Month: ").append(nz(receipt.getMonthLabel())).append('\n');
        sb.append("Mode: ").append(payLabel(receipt.getPayMode())).append('\n');
        sb.append(divider(width));
        sb.append(formatTotal("Due:", "Rs " + DF.format(n(receipt.getDue())), width));
        sb.append(formatTotal("Paid now:", "Rs " + DF.format(n(receipt.getAmount())), width));
        sb.append(formatTotal("Total paid:", "Rs " + DF.format(n(receipt.getPaidAmount())), width));
        sb.append(formatTotal("Balance:", "Rs " + DF.format(n(receipt.getBalance())), width));
        sb.append(divider(width));
        sb.append(center(nz(receipt.getAmountInWords()).toUpperCase(), width)).append('\n');
        if (!blank(receipt.getCollectedBy())) {
            sb.append(center("Collected by: " + receipt.getCollectedBy(), width)).append('\n');
        }
        sb.append(center("Thank You", width)).append("\n\n");
        return sb.toString();
    }

    private int receiptWidth(String printerName) {
        return printerName != null && printerName.contains("58") ? WIDTH_58 : WIDTH_80;
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

    private void writeAddress(ByteArrayOutputStream out, String address) {
        if (blank(address)) {
            return;
        }
        for (String line : address.split("\\r?\\n")) {
            if (!blank(line)) {
                write(out, line.trim() + "\n");
            }
        }
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
        return "upi".equalsIgnoreCase(mode) ? "UPI" : "CASH";
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
