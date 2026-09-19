package com.billing.pos;

import com.billing.admin.AdminService;
import com.billing.admin.dto.CompanyDetailsData;
import com.billing.pos.dto.PrintBillData;
import com.billing.pos.dto.PrintDispatchData;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.print.Doc;
import javax.print.DocFlavor;
import javax.print.DocPrintJob;
import javax.print.PrintService;
import javax.print.PrintServiceLookup;
import javax.print.SimpleDoc;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileWriter;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.text.DecimalFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * ESC/POS thermal print — same conditions as the old JSP POSPrinter:
 * printer_name and print_type come from company_details.
 * print_type 2 = A4 browser preview; 1 = send raw bytes to the named printer.
 * If the configured printer is missing, save a TXT receipt instead.
 */
@Service
@RequiredArgsConstructor
public class PosPrinterService {

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

    private final BillingReadService readService;
    private final AdminService adminService;

    public PrintDispatchData dispatch(String billNo) {
        CompanyDetailsData company = adminService.company();
        int printType = company.getPrintType() == null ? 1 : company.getPrintType();
        if (printType == 2) {
            PrintDispatchData data = new PrintDispatchData();
            data.setType("a4");
            data.setBillNo(billNo);
            data.setMessage("Opening A4 print preview");
            return data;
        }
        PrintBillData bill = readService.printBill(billNo);
        int width = receiptWidth(bill.getPrinterName());
        PrintDispatchData data = new PrintDispatchData();
        data.setType("thermal");
        data.setBillNo(billNo);
        data.setPrinterName(bill.getPrinterName());
        try {
            data.setRawBase64(Base64.getEncoder().encodeToString(buildReceipt(bill, width)));
            data.setPlainText(buildPlainText(bill, width));
        } catch (Exception ex) {
            throw new RuntimeException("Could not prepare receipt: " + ex.getMessage());
        }
        data.setMessage("Print on client printer: " + (bill.getPrinterName() == null ? "" : bill.getPrinterName()));
        return data;
    }

    public PrintDispatchData printReceipt(String billNo) {
        PrintBillData bill = readService.printBill(billNo);
        int width = receiptWidth(bill.getPrinterName());
        PrintService service = findPrintService(bill.getPrinterName());
        if (service != null) {
            try {
                byte[] receipt = buildReceipt(bill, width);
                if (!sendRaw(service.getName(), receipt)) {
                    throw new RuntimeException("Could not send raw data to " + service.getName());
                }
                PrintDispatchData data = new PrintDispatchData();
                data.setType("printed");
                data.setBillNo(billNo);
                data.setMessage("Printed to: " + service.getName());
                return data;
            } catch (Exception ex) {
                throw new RuntimeException("Print error: " + (ex.getMessage() == null ? "Unknown error" : ex.getMessage()));
            }
        }
        try {
            String txtPath = writeTxt(bill, width);
            File file = new File(txtPath);
            PrintDispatchData data = new PrintDispatchData();
            data.setType("txt");
            data.setBillNo(billNo);
            data.setTxtPath(txtPath.replace('\\', '/'));
            data.setTxtFile(file.getName());
            data.setMessage("No printer found. TXT saved to: " + data.getTxtPath());
            return data;
        } catch (Exception ex) {
            throw new RuntimeException("Could not save receipt: " + ex.getMessage());
        }
    }

    private int receiptWidth(String printerName) {
        return printerName != null && printerName.contains("58") ? WIDTH_58 : WIDTH_80;
    }

    /**
     * Send ESC/POS bytes as RAW — not a Windows page job.
     * GDI/XPS printing is what feeds a blank extra page and skips the cutter.
     */
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

    private String writeTxt(PrintBillData bill, int width) throws Exception {
        File dir = new File(System.getProperty("user.dir"), "bills");
        if (!dir.exists()) {
            dir.mkdirs();
        }
        String safe = bill.getBillDisplay().replace("/", "-").replace("\\", "-").replace(" ", "_");
        File file = new File(dir, "Bill_" + safe + ".txt");
        try (FileWriter writer = new FileWriter(file, StandardCharsets.UTF_8)) {
            writer.write(buildPlainText(bill, width));
        }
        return file.getAbsolutePath();
    }

    private byte[] buildReceipt(PrintBillData bill, int width) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        write(out, INIT);
        write(out, FONT_NORMAL);
        write(out, FONT_A);
        write(out, ALIGN_CENTER);
        write(out, BOLD_ON);
        write(out, nz(bill.getCompanyName()) + "\n");
        write(out, BOLD_OFF);
        writeAddress(out, bill.getCompanyAddress());
        if (!blank(bill.getCompanyGstin())) {
            write(out, "GSTIN: " + bill.getCompanyGstin() + "\n");
        }
        write(out, divider(width));
        write(out, ALIGN_LEFT);
        String date = nz(bill.getDate());
        write(out, padRight("Bill: " + nz(bill.getBillDisplay()), width - date.length()) + date + "\n");
        write(out, "Cust: " + nz(bill.getCustomerName()) + "\n");
        if (hasValue(bill.getCustomerPhone())) {
            write(out, "Ph: " + bill.getCustomerPhone() + "\n");
        }
        if (hasValue(bill.getCustomerGstin())) {
            write(out, "GSTIN: " + bill.getCustomerGstin() + "\n");
        }
        write(out, divider(width));
        write(out, BOLD_ON);
        write(out, itemHeader(width));
        write(out, BOLD_OFF);
        write(out, divider(width));
        Totals totals = writeItems(out, bill, width);
        write(out, divider(width));
        write(out, formatTotal("Items:", String.valueOf((int) totals.qty), width));
        if (totals.discount > 0) {
            write(out, formatTotal("Item Disc:", "-Rs " + DF.format(totals.discount), width));
        }
        if (totals.extra > 0) {
            write(out, formatTotal("Extra Disc:", "-Rs " + DF.format(totals.extra), width));
        }
        write(out, divider(width));
        write(out, BOLD_ON);
        write(out, formatTotal("TOTAL:", "Rs " + DF.format(totals.finalPaid), width));
        write(out, BOLD_OFF);
        write(out, divider(width));
        write(out, formatTotal("Paid:", "Rs " + DF.format(n(bill.getPaid())), width));
        if (n(bill.getBalance()) != 0) {
            write(out, BOLD_ON);
            String label = bill.getBalance() > 0 ? "Balance:" : "Change:";
            write(out, formatTotal(label, "Rs " + DF.format(Math.abs(bill.getBalance())), width));
            write(out, BOLD_OFF);
        }
        if (totals.gst > 0) {
            write(out, divider(width));
            write(out, BOLD_ON);
            write(out, "GST Summary:\n");
            write(out, BOLD_OFF);
            writeGst(out, totals, width);
        }
        write(out, divider(width));
        write(out, ALIGN_CENTER);
        write(out, nz(bill.getAmountInWords()).toUpperCase() + "\n");
        write(out, "Thank You! Visit Again\n");
        write(out, FEED_4_LINES);
        write(out, CUT_FEED);
        write(out, CUT_PARTIAL);
        return out.toByteArray();
    }

    private String buildPlainText(PrintBillData bill, int width) {
        StringBuilder sb = new StringBuilder();
        sb.append(center(nz(bill.getCompanyName()), width)).append('\n');
        if (!blank(bill.getCompanyAddress())) {
            for (String line : bill.getCompanyAddress().split("\\r?\\n")) {
                if (!blank(line)) {
                    sb.append(center(line.trim(), width)).append('\n');
                }
            }
        }
        if (!blank(bill.getCompanyGstin())) {
            sb.append(center("GSTIN: " + bill.getCompanyGstin(), width)).append('\n');
        }
        sb.append(divider(width));
        String date = nz(bill.getDate());
        sb.append(padRight("Bill: " + nz(bill.getBillDisplay()), width - date.length())).append(date).append('\n');
        sb.append("Cust: ").append(nz(bill.getCustomerName())).append('\n');
        if (hasValue(bill.getCustomerPhone())) {
            sb.append("Ph: ").append(bill.getCustomerPhone()).append('\n');
        }
        if (hasValue(bill.getCustomerGstin())) {
            sb.append("GSTIN: ").append(bill.getCustomerGstin()).append('\n');
        }
        sb.append(divider(width)).append(itemHeader(width)).append(divider(width));
        Totals totals = appendItems(sb, bill, width);
        sb.append(divider(width));
        sb.append(formatTotal("Items:", String.valueOf((int) totals.qty), width));
        if (totals.discount > 0) {
            sb.append(formatTotal("Item Disc:", "-Rs " + DF.format(totals.discount), width));
        }
        if (totals.extra > 0) {
            sb.append(formatTotal("Extra Disc:", "-Rs " + DF.format(totals.extra), width));
        }
        sb.append(divider(width));
        sb.append(formatTotal("TOTAL:", "Rs " + DF.format(totals.finalPaid), width));
        sb.append(divider(width));
        sb.append(formatTotal("Paid:", "Rs " + DF.format(n(bill.getPaid())), width));
        if (n(bill.getBalance()) != 0) {
            String label = bill.getBalance() > 0 ? "Balance:" : "Change:";
            sb.append(formatTotal(label, "Rs " + DF.format(Math.abs(bill.getBalance())), width));
        }
        if (totals.gst > 0) {
            sb.append(divider(width)).append("GST Summary:\n");
            List<Integer> rates = new ArrayList<>(totals.taxable.keySet());
            Collections.sort(rates);
            for (Integer rate : rates) {
                if (rate > 0) {
                    sb.append("GST").append(rate).append("% Txbl:Rs").append(DF.format(totals.taxable.get(rate))).append('\n');
                    sb.append("CGST:Rs").append(DF.format(totals.cgst.get(rate)))
                            .append(" SGST:Rs").append(DF.format(totals.sgst.get(rate))).append('\n');
                }
            }
            sb.append(formatTotal("Total GST:", "Rs " + DF.format(totals.gst), width));
        }
        sb.append(divider(width));
        sb.append(center(nz(bill.getAmountInWords()).toUpperCase(), width)).append('\n');
        sb.append(center("Thank You! Visit Again", width)).append("\n\n");
        return sb.toString();
    }

    private Totals writeItems(ByteArrayOutputStream out, PrintBillData bill, int width) {
        StringBuilder sb = new StringBuilder();
        Totals totals = appendItems(sb, bill, width);
        write(out, sb.toString());
        return totals;
    }

    private Totals appendItems(StringBuilder sb, PrintBillData bill, int width) {
        Totals totals = new Totals();
        totals.extra = n(bill.getExtraDiscount());
        if (bill.getItems() == null) {
            return totals;
        }
        for (PrintBillData.PrintLineData item : bill.getItems()) {
            double qty = n(item.getQty());
            double price = n(item.getPrice());
            double disc = n(item.getDiscount());
            double total = n(item.getTotal());
            int gstPer = item.getGst() == null ? 0 : item.getGst();
            double taxable = total / (1 + (gstPer / 100.0));
            double gstAmt = total - taxable;
            totals.qty += qty;
            totals.amount += total;
            totals.discount += disc;
            totals.gst += gstAmt;
            totals.taxable.merge(gstPer, taxable, Double::sum);
            totals.cgst.merge(gstPer, gstAmt / 2, Double::sum);
            totals.sgst.merge(gstPer, gstAmt / 2, Double::sum);
            sb.append(itemRow(nz(item.getName()), qtyStr(item.getQty()), DF.format(price), DF.format(total), gstPer, width));
            if (disc > 0) {
                sb.append(padLeft("Disc: -" + DF.format(disc), width)).append('\n');
            }
        }
        totals.finalPaid = totals.amount - totals.extra;
        return totals;
    }

    private void writeGst(ByteArrayOutputStream out, Totals totals, int width) {
        List<Integer> rates = new ArrayList<>(totals.taxable.keySet());
        Collections.sort(rates);
        for (Integer rate : rates) {
            if (rate > 0) {
                write(out, "GST" + rate + "% Txbl:Rs" + DF.format(totals.taxable.get(rate)) + "\n");
                write(out, "CGST:Rs" + DF.format(totals.cgst.get(rate)) + " SGST:Rs" + DF.format(totals.sgst.get(rate)) + "\n");
            }
        }
        write(out, BOLD_ON);
        write(out, formatTotal("Total GST:", "Rs " + DF.format(totals.gst), width));
        write(out, BOLD_OFF);
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

    private String itemHeader(int width) {
        if (width == WIDTH_58) {
            return padRight("ITEM", 18) + padRight("Q", 4) + padLeft("RATE", 5) + padLeft("AMT", 5) + "\n";
        }
        return padRight("ITEM", 28) + padRight("QTY", 6) + padLeft("RATE", 7) + padLeft("AMT", 7) + "\n";
    }

    private String itemRow(String name, String qty, String rate, String amt, int gstPer, int width) {
        int nameWidth = width == WIDTH_58 ? 18 : 28;
        int qtyW = width == WIDTH_58 ? 4 : 6;
        int numW = width == WIDTH_58 ? 5 : 7;
        if (gstPer > 0 && name.length() < nameWidth - 5) {
            name = name + "(" + gstPer + "%)";
        }
        if (name.length() > nameWidth) {
            name = name.substring(0, nameWidth);
        }
        return padRight(name, nameWidth) + padRight(qty, qtyW) + padLeft(rate, numW) + padLeft(amt, numW) + "\n";
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

    private String padLeft(String s, int width) {
        if (s == null) s = "";
        if (s.length() >= width) return s;
        return " ".repeat(width - s.length()) + s;
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

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private boolean hasValue(String value) {
        return !blank(value) && !"-".equals(value);
    }

    private String nz(String value) {
        return value == null ? "" : value;
    }

    private double n(Double value) {
        return value == null ? 0 : value;
    }

    private String qtyStr(Double qty) {
        if (qty == null) return "0";
        if (qty == Math.rint(qty)) return String.valueOf(qty.intValue());
        return String.valueOf(qty);
    }

    private static class Totals {
        double qty;
        double amount;
        double discount;
        double extra;
        double gst;
        double finalPaid;
        Map<Integer, Double> taxable = new HashMap<>();
        Map<Integer, Double> cgst = new HashMap<>();
        Map<Integer, Double> sgst = new HashMap<>();
    }
}
