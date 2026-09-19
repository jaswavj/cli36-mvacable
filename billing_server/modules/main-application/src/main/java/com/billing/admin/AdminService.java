package com.billing.admin;

import com.billing.admin.dto.AdminBillDetailData;
import com.billing.admin.dto.AdminBillLine;
import com.billing.admin.dto.AdminBillListData;
import com.billing.admin.dto.AdminBillRow;
import com.billing.admin.dto.AdminDueRow;
import com.billing.admin.dto.AssignCustomerRequest;
import com.billing.admin.dto.CancelBillRequest;
import com.billing.admin.dto.CancelBillRow;
import com.billing.admin.dto.CompanyDetailsData;
import com.billing.admin.dto.DateChangeRow;
import com.billing.admin.dto.DateUpdateRequest;
import com.billing.admin.dto.ExchangeBillData;
import com.billing.admin.dto.ExchangeItemData;
import com.billing.admin.dto.ExchangeProductData;
import com.billing.admin.dto.ExchangeReportRow;
import com.billing.admin.dto.ExchangeSaveRequest;
import com.billing.admin.dto.PaymentChangeRow;
import com.billing.admin.dto.PaymentInfoData;
import com.billing.admin.dto.PaymentUpdateRequest;
import com.billing.admin.dto.ReturnSaveRequest;
import com.billing.admin.dto.SimpleIdName;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final JdbcTemplate jdbcTemplate;

    public CompanyDetailsData company() {
        List<CompanyDetailsData> rows = jdbcTemplate.query(
                "SELECT id, shop_name, address, gstin, print_type, printer_name, bank_details, barcode_printer FROM company_details LIMIT 1",
                (rs, i) -> {
                    CompanyDetailsData data = new CompanyDetailsData();
                    data.setId(rs.getLong("id"));
                    data.setShopName(nz(rs.getString("shop_name")));
                    data.setAddress(nz(rs.getString("address")));
                    data.setGstin(nz(rs.getString("gstin")));
                    data.setPrintType(rs.getInt("print_type"));
                    data.setPrinterName(nz(rs.getString("printer_name")));
                    data.setBankDetails(nz(rs.getString("bank_details")));
                    data.setBarcodePrinter(nz(rs.getString("barcode_printer")));
                    return data;
                }
        );
        if (rows.isEmpty()) {
            CompanyDetailsData empty = new CompanyDetailsData();
            empty.setPrintType(1);
            empty.setShopName("");
            empty.setAddress("");
            empty.setGstin("");
            empty.setPrinterName("");
            empty.setBankDetails("");
            empty.setBarcodePrinter("");
            return empty;
        }
        return rows.get(0);
    }

    @Transactional
    public void saveCompany(CompanyDetailsData request) {
        String shopName = required(request.getShopName(), "Please fill all required fields");
        String address = required(request.getAddress(), "Please fill all required fields");
        int printType = request.getPrintType() == null ? 1 : request.getPrintType();
        if (printType != 1 && printType != 2) {
            throw new RuntimeException("Invalid print type");
        }
        String printerName = nz(request.getPrinterName()).trim();
        if (printType == 1 && printerName.isEmpty()) {
            throw new RuntimeException("Printer name is required for thermal printing");
        }
        String gstin = nz(request.getGstin()).trim().toUpperCase();
        if (!gstin.isEmpty() && gstin.length() != 15) {
            throw new RuntimeException("GSTIN must be 15 characters");
        }
        String bankDetails = nz(request.getBankDetails()).trim();
        String barcodePrinter = nz(request.getBarcodePrinter()).trim();
        Long id = jdbcTemplate.query("SELECT id FROM company_details LIMIT 1", rs -> rs.next() ? rs.getLong(1) : null);
        if (id != null) {
            jdbcTemplate.update(
                    "UPDATE company_details SET shop_name=?, address=?, gstin=?, print_type=?, printer_name=?, bank_details=?, barcode_printer=? WHERE id=?",
                    shopName, address, gstin, printType, printerName, bankDetails, barcodePrinter, id
            );
        } else {
            jdbcTemplate.update(
                    "INSERT INTO company_details (shop_name, address, gstin, print_type, printer_name, bank_details, barcode_printer) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    shopName, address, gstin, printType, printerName, bankDetails, barcodePrinter
            );
        }
    }

    public List<SimpleIdName> users() {
        return jdbcTemplate.query(
                "SELECT id, CONCAT(IFNULL(fullName, user_name), ' (', user_name, ')') AS uname FROM users WHERE is_active=1 ORDER BY fullName",
                (rs, i) -> {
                    SimpleIdName row = new SimpleIdName();
                    row.setId(rs.getLong("id"));
                    row.setName(rs.getString("uname"));
                    return row;
                }
        );
    }

    public AdminBillListData bills(String from, String to, Long userId) {
        String billSql =
                "SELECT a.bill_display, a.total, a.prodDisc + a.extraDisc AS discount, a.payable, a.paid, a.date, a.time, b.user_name, " +
                        "a.id, a.balance " +
                        "FROM prod_bill a JOIN users b ON b.id = a.uid " +
                        "WHERE a.is_cancelled = 0 AND a.date BETWEEN ? AND ? ";
        Object[] billArgs = (userId != null && userId > 0)
                ? new Object[]{from, to, userId}
                : new Object[]{from, to};
        if (userId != null && userId > 0) {
            billSql += "AND a.uid = ? ";
        }
        billSql += "ORDER BY a.id DESC";
        List<AdminBillRow> bills = jdbcTemplate.query(billSql, (rs, i) -> {
            AdminBillRow row = new AdminBillRow();
            row.setBillNo(rs.getString("bill_display"));
            row.setTotal(rs.getDouble("total"));
            row.setDiscount(rs.getDouble("discount"));
            row.setPayable(rs.getDouble("payable"));
            row.setPaid(rs.getDouble("paid"));
            row.setDate(asStr(rs.getDate("date")));
            row.setTime(asStr(rs.getTime("time")));
            row.setUserName(rs.getString("user_name"));
            row.setId(rs.getLong("id"));
            row.setBalance(rs.getDouble("balance"));
            return row;
        }, billArgs);

        String dueSql =
                "SELECT c.name, a.balance, a.cash_paid, a.bank_paid, " +
                        "CASE WHEN a.pay_mode = 1 THEN 'Cash' ELSE 'Bank' END AS mode, " +
                        "CASE WHEN a.pay_type = 0 THEN '-' WHEN a.pay_type = 1 THEN 'UPI' WHEN a.pay_type = 2 THEN 'DEBIT CARD' " +
                        "WHEN a.pay_type = 3 THEN 'CREDIT CARD' WHEN a.pay_type = 4 THEN 'NEFT' WHEN a.pay_type = 5 THEN 'WALLET' END AS bank, " +
                        "a.date, a.time, u.user_name " +
                        "FROM prod_bill_due a JOIN customers c ON a.customer_id = c.id JOIN users u ON a.uid = u.id " +
                        "WHERE a.date BETWEEN ? AND ? ";
        Object[] dueArgs = (userId != null && userId > 0)
                ? new Object[]{from, to, userId}
                : new Object[]{from, to};
        if (userId != null && userId > 0) {
            dueSql += "AND a.uid = ? ";
        }
        dueSql += "ORDER BY a.date DESC, a.time DESC";
        List<AdminDueRow> dues = jdbcTemplate.query(dueSql, (rs, i) -> {
            AdminDueRow row = new AdminDueRow();
            row.setCustomerName(rs.getString("name"));
            row.setBalance(rs.getDouble("balance"));
            row.setCashPaid(rs.getDouble("cash_paid"));
            row.setBankPaid(rs.getDouble("bank_paid"));
            row.setMode(rs.getString("mode"));
            row.setBank(rs.getString("bank"));
            row.setDate(asStr(rs.getDate("date")));
            row.setTime(asStr(rs.getTime("time")));
            row.setUserName(rs.getString("user_name"));
            return row;
        }, dueArgs);

        AdminBillListData data = new AdminBillListData();
        data.setBills(bills);
        data.setDues(dues);
        return data;
    }

    public AdminBillDetailData billDetail(Long billId) {
        List<Map<String, Object>> info = jdbcTemplate.queryForList(
                "SELECT a.total, a.prodDisc, a.extraDisc, a.payable, a.paid, IFNULL(b.cash,0) AS cash, IFNULL(b.bank,0) AS bank, " +
                        "a.balance, a.currentBalance, a.date, a.bill_display " +
                        "FROM prod_bill a LEFT JOIN prod_bill_payment b ON a.id = b.bill_id WHERE a.id = ? LIMIT 1",
                billId
        );
        if (info.isEmpty()) {
            throw new RuntimeException("No bill info found");
        }
        Map<String, Object> row = info.get(0);
        AdminBillDetailData data = new AdminBillDetailData();
        data.setId(billId);
        data.setTotal(toD(row.get("total")));
        data.setProdDisc(toD(row.get("prodDisc")));
        data.setExtraDisc(toD(row.get("extraDisc")));
        data.setPayable(toD(row.get("payable")));
        data.setPaid(toD(row.get("paid")));
        data.setCash(toD(row.get("cash")));
        data.setBank(toD(row.get("bank")));
        data.setBalance(toD(row.get("balance")));
        data.setCurrentBalance(toD(row.get("currentBalance")));
        data.setDate(row.get("date") == null ? "" : row.get("date").toString());
        data.setBillNo(String.valueOf(row.get("bill_display")));
        data.setCancelBlockMsg(validateCancel(billId));
        data.setLines(jdbcTemplate.query(
                "SELECT bd.id, bd.prod_id, p.name AS product_name, bd.qty, bd.price, bd.disc, bd.total " +
                        "FROM prod_bill_details bd JOIN prod_product p ON bd.prod_id = p.id WHERE bd.bill_id = ?",
                (rs, i) -> {
                    AdminBillLine line = new AdminBillLine();
                    line.setId(rs.getLong("id"));
                    line.setProductId(rs.getLong("prod_id"));
                    line.setProductName(rs.getString("product_name"));
                    line.setQty(rs.getDouble("qty"));
                    line.setPrice(rs.getDouble("price"));
                    line.setDisc(rs.getDouble("disc"));
                    line.setTotal(rs.getDouble("total"));
                    return line;
                },
                billId
        ));
        return data;
    }

    @Transactional
    public void updateBillDate(Long billId, DateUpdateRequest request, Long uid) {
        String newDate = required(request == null ? null : request.getNewDate(), "Invalid parameters.");
        List<String> old = jdbcTemplate.query("SELECT date FROM prod_bill WHERE id = ?", (rs, i) -> asStr(rs.getDate(1)), billId);
        if (old.isEmpty()) {
            throw new RuntimeException("Bill not found");
        }
        jdbcTemplate.update(
                "INSERT INTO prod_bill_datechange (billId, oldDate, changeDate, date, time, uid) VALUES (?, ?, ?, CURDATE(), CURTIME(), ?)",
                billId, old.get(0), newDate, uid
        );
        jdbcTemplate.update("UPDATE prod_bill SET date = ? WHERE id = ?", newDate, billId);
    }

    @Transactional
    public void cancelBill(Long billId, CancelBillRequest request, Long uid) {
        String reason = required(request == null ? null : request.getReason(), "Reason for cancellation is required");
        String block = validateCancel(billId);
        if (block != null) {
            throw new RuntimeException(block);
        }
        List<Map<String, Object>> bills = jdbcTemplate.queryForList(
                "SELECT customerId, currentBalance FROM prod_bill WHERE id = ? AND is_cancelled = 0",
                billId
        );
        if (bills.isEmpty()) {
            throw new RuntimeException("Bill not found or already cancelled: " + billId);
        }
        long customerId = toL(bills.get(0).get("customerId"));
        double dueAmount = toD(bills.get(0).get("currentBalance"));
        jdbcTemplate.update("UPDATE prod_bill SET is_cancelled = 1 WHERE id = ?", billId);
        jdbcTemplate.update(
                "INSERT INTO prod_bill_cancel (bill_id, reason, date, time, uid) VALUES (?, ?, CURDATE(), CURTIME(), ?)",
                billId, reason, uid
        );
        if (customerId > 0 && dueAmount > 0) {
            int rows = jdbcTemplate.update(
                    "UPDATE customer_account SET balance = GREATEST(0, balance - ?) WHERE customer_id = ?",
                    dueAmount, customerId
            );
            if (rows == 0) {
                jdbcTemplate.update("INSERT INTO customer_account (customer_id, advance, balance) VALUES (?, 0.00, 0.00)", customerId);
            }
        }
        List<AdminBillLine> lines = jdbcTemplate.query(
                "SELECT bd.id, bd.prod_id, p.name AS product_name, bd.qty, bd.price, bd.disc, bd.total " +
                        "FROM prod_bill_details bd JOIN prod_product p ON bd.prod_id = p.id WHERE bd.bill_id = ?",
                (rs, i) -> {
                    AdminBillLine line = new AdminBillLine();
                    line.setProductId(rs.getLong("prod_id"));
                    line.setQty(rs.getDouble("qty"));
                    return line;
                },
                billId
        );
        for (AdminBillLine line : lines) {
            Integer zero = jdbcTemplate.query(
                    "SELECT CASE WHEN is_zero_stock_bill=1 THEN 1 ELSE 0 END AS STATUS FROM prod_lifecycle WHERE bill_id=? AND product_id=? AND is_zero_stock_bill=1",
                    rs -> rs.next() ? rs.getInt(1) : 0,
                    billId, line.getProductId()
            );
            if (zero != null && zero == 1) {
                continue;
            }
            restoreStock(line.getProductId(), BigDecimal.valueOf(line.getQty()), uid, billId, "Cancel bill - returned to stock");
        }
    }

    public PaymentInfoData paymentInfo(String billNo) {
        String no = required(billNo, "Bill number is required");
        List<PaymentInfoData> rows = jdbcTemplate.query(
                "SELECT a.id, a.bill_display, a.date, IFNULL(a.cusName,'') AS cusName, a.payable, a.paymentMode, a.paymentType, " +
                        "IFNULL(b.cash, 0) AS cash, IFNULL(b.bank, 0) AS bank " +
                        "FROM prod_bill a LEFT JOIN prod_bill_payment b ON b.bill_id = a.id " +
                        "WHERE a.bill_display = ? AND a.is_cancelled = 0 LIMIT 1",
                (rs, i) -> {
                    PaymentInfoData data = new PaymentInfoData();
                    data.setBillId(rs.getLong("id"));
                    data.setBillNo(rs.getString("bill_display"));
                    data.setDate(asStr(rs.getDate("date")));
                    data.setCusName(rs.getString("cusName"));
                    data.setPayable(rs.getDouble("payable"));
                    data.setPaymentMode(rs.getInt("paymentMode"));
                    data.setPaymentType(rs.getInt("paymentType"));
                    data.setCash(rs.getDouble("cash"));
                    data.setBank(rs.getDouble("bank"));
                    return data;
                },
                no
        );
        if (rows.isEmpty()) {
            throw new RuntimeException("Bill not found or has been cancelled");
        }
        return rows.get(0);
    }

    @Transactional
    public void updatePayment(PaymentUpdateRequest request, Long uid) {
        if (request == null || request.getBillId() == null) {
            throw new RuntimeException("Invalid parameters.");
        }
        double cash = nz(request.getCash());
        double bank = nz(request.getBank());
        int bankMode = request.getBankMode() == null ? 1 : request.getBankMode();
        if (cash < 0 || bank < 0) {
            throw new RuntimeException("Amounts cannot be negative.");
        }
        if (cash == 0 && bank == 0) {
            throw new RuntimeException("At least one payment amount must be greater than zero.");
        }
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT IFNULL(b.cash,0) AS cash, IFNULL(b.bank,0) AS bank FROM prod_bill a " +
                        "LEFT JOIN prod_bill_payment b ON b.bill_id = a.id WHERE a.id = ? AND a.is_cancelled = 0 LIMIT 1",
                request.getBillId()
        );
        if (rows.isEmpty()) {
            throw new RuntimeException("Bill not found or has been cancelled.");
        }
        double oldCash = toD(rows.get(0).get("cash"));
        double oldBank = toD(rows.get(0).get("bank"));
        int paymentMode = cash > 0 && bank > 0 ? 3 : bank > 0 ? 2 : 1;
        int paymentType = bank > 0 ? bankMode : 0;
        jdbcTemplate.update(
                "UPDATE prod_bill_payment SET cash = ?, bank = ?, paymentType = ? WHERE bill_id = ?",
                cash, bank, paymentType, request.getBillId()
        );
        jdbcTemplate.update(
                "UPDATE prod_bill SET paymentMode = ?, paymentType = ?, paid = ? WHERE id = ?",
                paymentMode, paymentType, cash + bank, request.getBillId()
        );
        jdbcTemplate.update(
                "INSERT INTO prod_bill_payment_type_change (bill_id, old_cash_amount, cash_amount, old_bank_amount, bank_amount, bank_mode, uid, date_time) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
                request.getBillId(), oldCash, cash, oldBank, bank, bank > 0 ? bankMode : null, uid
        );
    }

    public ExchangeBillData exchangeBill(String billNo) {
        String no = required(billNo, "Missing bill number");
        List<Map<String, Object>> header = jdbcTemplate.queryForList(
                "SELECT id, customerId, total, payable, paid, cusName, date FROM prod_bill WHERE bill_display = ? AND is_cancelled = 0",
                no
        );
        if (header.isEmpty()) {
            throw new RuntimeException("Bill not found");
        }
        Map<String, Object> h = header.get(0);
        ExchangeBillData data = new ExchangeBillData();
        data.setBillId(toL(h.get("id")));
        data.setBillNo(no);
        data.setCustomerId(toL(h.get("customerId")));
        data.setCusName(h.get("cusName") == null ? "-" : String.valueOf(h.get("cusName")));
        data.setTotal(String.valueOf(h.get("total")));
        data.setPayable(String.valueOf(h.get("payable")));
        data.setPaid(String.valueOf(h.get("paid")));
        data.setBillDate(h.get("date") == null ? "-" : String.valueOf(h.get("date")));
        data.setItems(jdbcTemplate.query(
                "SELECT bd.id, bd.prod_id, p.name, bd.qty, bd.price, bd.disc, bd.total, IFNULL(bd.is_exchanged, 0) AS is_exchanged " +
                        "FROM prod_bill b JOIN prod_bill_details bd ON bd.bill_id = b.id JOIN prod_product p ON p.id = bd.prod_id " +
                        "WHERE b.bill_display = ? AND b.is_cancelled = 0 AND bd.is_cancelled = 0",
                (rs, i) -> {
                    ExchangeItemData item = new ExchangeItemData();
                    item.setDetailId(rs.getLong("id"));
                    item.setProdId(rs.getLong("prod_id"));
                    item.setProductName(rs.getString("name"));
                    item.setQty(rs.getDouble("qty"));
                    item.setPrice(rs.getDouble("price"));
                    item.setDisc(rs.getDouble("disc"));
                    item.setTotal(rs.getDouble("total"));
                    item.setIsExchanged(rs.getInt("is_exchanged"));
                    return item;
                },
                no
        ));
        return data;
    }

    public List<ExchangeProductData> searchExchangeProducts(String term) {
        String q = term == null ? "" : term.trim();
        if (q.isEmpty()) {
            return List.of();
        }
        return jdbcTemplate.query(
                "SELECT p.id, p.name, IFNULL(b.mrp, 0) AS mrp, COALESCE(p.code,'') AS code " +
                        "FROM prod_product p LEFT JOIN prod_batch b ON b.product_id = p.id " +
                        "WHERE p.is_active = 1 AND (p.name LIKE ? OR p.code LIKE ?) " +
                        "GROUP BY p.id, p.name, b.mrp, p.code ORDER BY p.name LIMIT 20",
                (rs, i) -> {
                    ExchangeProductData row = new ExchangeProductData();
                    row.setId(rs.getLong("id"));
                    row.setName(rs.getString("name"));
                    row.setMrp(rs.getDouble("mrp"));
                    row.setCode(rs.getString("code"));
                    return row;
                },
                "%" + q + "%", "%" + q + "%"
        );
    }

    @Transactional
    public Map<String, Object> assignCustomer(AssignCustomerRequest request) {
        if (request == null || request.getBillId() == null) {
            throw new RuntimeException("Invalid bill.");
        }
        String cusName = required(request.getCusName(), "Customer name is required.");
        String cusPhn = request.getCusPhn() == null ? "" : request.getCusPhn().trim();
        long customerId = request.getCustomerId() == null ? 0 : request.getCustomerId();
        boolean isNew = false;
        if (customerId <= 0) {
            List<Long> existing = jdbcTemplate.query(
                    "SELECT id FROM customers WHERE name = ? LIMIT 1",
                    (rs, i) -> rs.getLong(1),
                    cusName
            );
            if (!existing.isEmpty()) {
                customerId = existing.get(0);
            } else {
                KeyHolder keys = new GeneratedKeyHolder();
                jdbcTemplate.update(con -> {
                    PreparedStatement ps = con.prepareStatement(
                            "INSERT INTO customers(name, date, time, address, phone_number, gstin, is_gst, is_eligible_for_commission) VALUES (?, NOW(), NOW(), '', ?, '', 0, 0)",
                            Statement.RETURN_GENERATED_KEYS
                    );
                    ps.setString(1, cusName);
                    ps.setString(2, cusPhn);
                    return ps;
                }, keys);
                Number key = keys.getKey();
                if (key == null) {
                    throw new RuntimeException("Failed to create customer.");
                }
                customerId = key.longValue();
                jdbcTemplate.update("INSERT INTO customer_account(customer_id, advance, balance) VALUES (?, 0.00, 0.00)", customerId);
                isNew = true;
            }
        }
        if (customerId <= 1) {
            throw new RuntimeException("Please select a valid customer.");
        }
        int updated = jdbcTemplate.update(
                "UPDATE prod_bill SET customerId = ?, cusName = ?, cusPhn = ? WHERE id = ? AND is_cancelled = 0 " +
                        "AND (customerId IS NULL OR customerId <= 1)",
                customerId, cusName, cusPhn, request.getBillId()
        );
        if (updated == 0) {
            throw new RuntimeException("Bill not found or customer already assigned.");
        }
        return Map.of(
                "message", isNew ? "New customer created and assigned to bill." : "Customer updated successfully.",
                "customerId", customerId,
                "cusName", cusName,
                "cusPhn", cusPhn,
                "isNewCustomer", isNew
        );
    }

    @Transactional
    public String saveExchange(ExchangeSaveRequest request, Long uid) {
        if (request == null || request.getDetailId() == null || request.getNewProdId() == null) {
            throw new RuntimeException("Missing required parameters");
        }
        String billNo = required(request.getBillNo(), "Missing required parameters");
        double newPrice = nz(request.getNewPrice());
        if (newPrice <= 0) {
            throw new RuntimeException("Price must be greater than zero");
        }
        List<Map<String, Object>> details = jdbcTemplate.queryForList(
                "SELECT bd.id, bd.bill_id, bd.prod_id, bd.qty, bd.price, bd.total, IFNULL(bd.is_exchanged, 0) AS is_exchanged " +
                        "FROM prod_bill_details bd WHERE bd.id = ? AND bd.is_cancelled = 0",
                request.getDetailId()
        );
        if (details.isEmpty()) {
            throw new RuntimeException("Bill detail not found or already cancelled.");
        }
        Map<String, Object> d = details.get(0);
        if (toL(d.get("is_exchanged")) == 1) {
            throw new RuntimeException("This item has already been exchanged.");
        }
        long fetchedBillId = toL(d.get("bill_id"));
        long oldProdId = toL(d.get("prod_id"));
        BigDecimal qty = toBd(d.get("qty"));
        double oldItemTotal = toD(d.get("total"));

        List<Map<String, Object>> bills = jdbcTemplate.queryForList(
                "SELECT id, customerId, total, payable, paid FROM prod_bill WHERE bill_display = ? AND is_cancelled = 0",
                billNo
        );
        if (bills.isEmpty()) {
            throw new RuntimeException("Bill not found: " + billNo);
        }
        Map<String, Object> b = bills.get(0);
        long billId = toL(b.get("id"));
        long customerId = toL(b.get("customerId"));
        boolean hasCustomer = customerId > 0;
        if (billId != fetchedBillId) {
            throw new RuntimeException("Bill / detail mismatch.");
        }
        if (customerId <= 1) {
            throw new RuntimeException("Please assign the actual customer to this bill before exchange.");
        }
        double newItemTotal = scale(BigDecimal.valueOf(newPrice).multiply(qty));
        double diff = scale(BigDecimal.valueOf(newItemTotal - oldItemTotal));
        double newBillTotal = scale(BigDecimal.valueOf(toD(b.get("total")) + diff));
        double newBillPayable = scale(BigDecimal.valueOf(toD(b.get("payable")) + diff));

        Long oldBatchId = latestBatch(oldProdId);
        Long newBatchId = latestBatch(request.getNewProdId());
        if (oldBatchId != null) {
            jdbcTemplate.update("UPDATE prod_batch SET stock = stock + ? WHERE id = ?", qty, oldBatchId);
            BigDecimal oldNow = lastStockNow(oldProdId).add(qty);
            jdbcTemplate.update(
                    "INSERT INTO prod_lifecycle (bill_id, batch_id, product_id, stock_in, stock_out, stock_now, notes, date, time, uid, stock_type, stockAdjType) " +
                            "VALUES (?, ?, ?, ?, 0, ?, 'PRODUCT EXCHANGE - RETURNED', NOW(), NOW(), ?, 1, 1)",
                    billId, oldBatchId, oldProdId, qty, oldNow, uid
            );
        }
        if (newBatchId != null) {
            BigDecimal current = jdbcTemplate.query(
                    "SELECT stock FROM prod_batch WHERE id = ?",
                    rs -> rs.next() ? rs.getBigDecimal(1) : BigDecimal.ZERO,
                    newBatchId
            );
            BigDecimal last = lastStockNow(request.getNewProdId());
            if (current != null && current.compareTo(qty) >= 0) {
                jdbcTemplate.update("UPDATE prod_batch SET stock = stock - ? WHERE id = ?", qty, newBatchId);
                jdbcTemplate.update(
                        "INSERT INTO prod_lifecycle (bill_id, batch_id, product_id, stock_in, stock_out, stock_now, notes, date, time, uid, stock_type, stockAdjType) " +
                                "VALUES (?, ?, ?, 0, ?, ?, 'PRODUCT EXCHANGE - GIVEN', NOW(), NOW(), ?, 1, 2)",
                        billId, newBatchId, request.getNewProdId(), qty, last.subtract(qty), uid
                );
            } else {
                jdbcTemplate.update(
                        "INSERT INTO prod_batch_zero_stock_bill (batch_id, product_id, qty, date, time, uid) VALUES (?, ?, ?, NOW(), NOW(), ?)",
                        newBatchId, request.getNewProdId(), qty, uid
                );
                jdbcTemplate.update(
                        "INSERT INTO prod_lifecycle (bill_id, batch_id, product_id, stock_in, stock_out, stock_now, notes, date, time, uid, stock_type, is_zero_stock_bill, stockAdjType) " +
                                "VALUES (?, ?, ?, 0, ?, ?, 'PRODUCT EXCHANGE - GIVEN WITHOUT STOCK', NOW(), NOW(), ?, 1, 1, 2)",
                        billId, newBatchId, request.getNewProdId(), qty, last, uid
                );
            }
        }
        jdbcTemplate.update(
                "UPDATE prod_bill_details SET prod_id = ?, price = ?, disc = 0, total = ?, is_exchanged = 1 WHERE id = ?",
                request.getNewProdId(), newPrice, newItemTotal, request.getDetailId()
        );
        jdbcTemplate.update("UPDATE prod_bill SET total = ?, payable = ? WHERE id = ?", newBillTotal, newBillPayable, billId);
        jdbcTemplate.update(
                "INSERT INTO pro_bill_exchange (bill_id, customer_id, old_prod_id, new_prod_id, uid, date_time) VALUES (?, ?, ?, ?, ?, NOW())",
                billId, hasCustomer ? customerId : null, oldProdId, request.getNewProdId(), uid
        );
        if (diff < 0 && hasCustomer) {
            double points = Math.abs(diff);
            double oldPoint = jdbcTemplate.query(
                    "SELECT IFNULL(exchange_point, 0) FROM customers WHERE id = ?",
                    rs -> rs.next() ? rs.getDouble(1) : 0d,
                    customerId
            );
            double totalPoint = scale(BigDecimal.valueOf(oldPoint + points));
            jdbcTemplate.update("UPDATE customers SET exchange_point = ? WHERE id = ?", totalPoint, customerId);
            jdbcTemplate.update(
                    "INSERT INTO customers_exchange_point (customer_id, bill_id, old_point, exchange_point, total_point, uid, date_time, notes) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)",
                    customerId, billId, oldPoint, points, totalPoint, uid, "Points earned on product exchange (Bill: " + billNo + ")"
            );
            return "Exchange completed. Customer earned Rs " + String.format("%.2f", points)
                    + " exchange points. Total points: Rs " + String.format("%.2f", totalPoint);
        }
        if (diff > 0) {
            return "Exchange completed. Bill amount increased by Rs " + String.format("%.2f", diff);
        }
        return "Exchange completed. Same amount - no change to bill or points.";
    }

    @Transactional
    public String saveReturn(ReturnSaveRequest request, Long uid) {
        if (request == null || request.getDetailId() == null) {
            throw new RuntimeException("Missing required parameters");
        }
        String billNo = required(request.getBillNo(), "Missing required parameters");
        List<Map<String, Object>> details = jdbcTemplate.queryForList(
                "SELECT bd.id, bd.bill_id, bd.prod_id, bd.qty, bd.total, IFNULL(bd.is_exchanged, 0) AS is_exchanged " +
                        "FROM prod_bill_details bd WHERE bd.id = ? AND bd.is_cancelled = 0",
                request.getDetailId()
        );
        if (details.isEmpty()) {
            throw new RuntimeException("Bill detail not found or already cancelled.");
        }
        Map<String, Object> d = details.get(0);
        int status = (int) toL(d.get("is_exchanged"));
        if (status == 1) {
            throw new RuntimeException("This item has already been exchanged.");
        }
        if (status == 2) {
            throw new RuntimeException("This item has already been returned.");
        }
        BigDecimal totalQty = toBd(d.get("qty"));
        BigDecimal retQty = request.getReturnQty() == null ? totalQty : BigDecimal.valueOf(request.getReturnQty()).setScale(3, RoundingMode.HALF_UP);
        if (retQty.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Return quantity must be greater than zero.");
        }
        if (retQty.compareTo(totalQty) > 0) {
            throw new RuntimeException("Return quantity (" + retQty + ") exceeds bill quantity (" + totalQty + ").");
        }
        double itemTotal = toD(d.get("total"));
        double retAmount = BigDecimal.valueOf(itemTotal).multiply(retQty).divide(totalQty, 3, RoundingMode.HALF_UP).doubleValue();
        boolean full = retQty.compareTo(totalQty) == 0;
        long fetchedBillId = toL(d.get("bill_id"));
        long prodId = toL(d.get("prod_id"));

        List<Map<String, Object>> bills = jdbcTemplate.queryForList(
                "SELECT id, customerId, total, payable FROM prod_bill WHERE bill_display = ? AND is_cancelled = 0",
                billNo
        );
        if (bills.isEmpty()) {
            throw new RuntimeException("Bill not found: " + billNo);
        }
        Map<String, Object> b = bills.get(0);
        long billId = toL(b.get("id"));
        long customerId = toL(b.get("customerId"));
        boolean hasCustomer = customerId > 0;
        if (billId != fetchedBillId) {
            throw new RuntimeException("Bill / detail mismatch.");
        }
        if (customerId <= 1) {
            throw new RuntimeException("Please assign the actual customer to this bill before return.");
        }
        Long batchId = latestBatch(prodId);
        if (batchId != null) {
            jdbcTemplate.update("UPDATE prod_batch SET stock = stock + ? WHERE id = ?", retQty, batchId);
            jdbcTemplate.update(
                    "INSERT INTO prod_lifecycle (bill_id, batch_id, product_id, stock_in, stock_out, stock_now, notes, date, time, uid, stock_type, stockAdjType) " +
                            "VALUES (?, ?, ?, ?, 0, ?, 'PRODUCT RETURN', NOW(), NOW(), ?, 1, 1)",
                    billId, batchId, prodId, retQty, lastStockNow(prodId).add(retQty), uid
            );
        }
        double newBillTotal = Math.max(0, scale(BigDecimal.valueOf(toD(b.get("total")) - retAmount)));
        double newBillPayable = Math.max(0, scale(BigDecimal.valueOf(toD(b.get("payable")) - retAmount)));
        jdbcTemplate.update("UPDATE prod_bill SET total = ?, payable = ? WHERE id = ?", newBillTotal, newBillPayable, billId);
        if (full) {
            jdbcTemplate.update("UPDATE prod_bill_details SET is_exchanged = 2 WHERE id = ?", request.getDetailId());
        } else {
            BigDecimal newQty = totalQty.subtract(retQty).setScale(3, RoundingMode.HALF_UP);
            double newItemTotal = Math.max(0, scale(BigDecimal.valueOf(itemTotal - retAmount)));
            jdbcTemplate.update("UPDATE prod_bill_details SET qty = ?, total = ? WHERE id = ?", newQty, newItemTotal, request.getDetailId());
        }
        jdbcTemplate.update(
                "INSERT INTO pro_bill_exchange (bill_id, customer_id, old_prod_id, new_prod_id, uid, date_time) VALUES (?, ?, ?, ?, ?, NOW())",
                billId, hasCustomer ? customerId : null, prodId, prodId, uid
        );
        if (hasCustomer) {
            double oldPoint = jdbcTemplate.query(
                    "SELECT IFNULL(exchange_point, 0) FROM customers WHERE id = ?",
                    rs -> rs.next() ? rs.getDouble(1) : 0d,
                    customerId
            );
            double totalPoint = scale(BigDecimal.valueOf(oldPoint + retAmount));
            jdbcTemplate.update("UPDATE customers SET exchange_point = ? WHERE id = ?", totalPoint, customerId);
            jdbcTemplate.update(
                    "INSERT INTO customers_exchange_point (customer_id, bill_id, old_point, exchange_point, total_point, uid, date_time, notes) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)",
                    customerId, billId, oldPoint, retAmount, totalPoint, uid,
                    "Points earned on product return (Bill: " + billNo + ", Qty: " + retQty + ")"
            );
            return "Return completed for qty " + retQty + ". Bill reduced by Rs " + String.format("%.2f", retAmount)
                    + ". Customer earned Rs " + String.format("%.2f", retAmount)
                    + " exchange points. Total points: Rs " + String.format("%.2f", totalPoint);
        }
        return "Return completed for qty " + retQty + ". Bill reduced by Rs " + String.format("%.2f", retAmount)
                + ". No customer linked - exchange points not credited.";
    }

    public List<DateChangeRow> dateChangeReport(String from, String to) {
        return jdbcTemplate.query(
                "SELECT a.billId, b.bill_display, a.oldDate, a.changeDate, a.date, a.time, c.user_name " +
                        "FROM prod_bill_datechange a JOIN prod_bill b ON a.billId = b.id JOIN users c ON a.uid = c.id " +
                        "WHERE a.date BETWEEN ? AND ? ORDER BY a.date DESC, a.time DESC",
                (rs, i) -> {
                    DateChangeRow row = new DateChangeRow();
                    row.setBillId(rs.getLong(1));
                    row.setBillNo(rs.getString(2));
                    row.setOldDate(asStr(rs.getObject(3)));
                    row.setNewDate(asStr(rs.getObject(4)));
                    row.setChangeDate(asStr(rs.getObject(5)));
                    row.setChangeTime(asStr(rs.getObject(6)));
                    row.setUserName(rs.getString(7));
                    return row;
                },
                from, to
        );
    }

    public List<CancelBillRow> cancelReport(String from, String to) {
        return jdbcTemplate.query(
                "SELECT b.bill_display, b.payable, b.paid, a.reason, a.date, a.time, c.user_name, b.id " +
                        "FROM prod_bill_cancel a, prod_bill b, users c WHERE a.bill_id = b.id AND a.uid = c.id AND a.date BETWEEN ? AND ?",
                (rs, i) -> {
                    CancelBillRow row = new CancelBillRow();
                    row.setBillNo(rs.getString(1));
                    row.setPayable(rs.getDouble(2));
                    row.setPaid(rs.getDouble(3));
                    row.setReason(rs.getString(4));
                    row.setDate(asStr(rs.getDate(5)));
                    row.setTime(asStr(rs.getTime(6)));
                    row.setUserName(rs.getString(7));
                    row.setBillId(rs.getLong(8));
                    return row;
                },
                from, to
        );
    }

    public List<PaymentChangeRow> paymentChangeReport(String from, String to) {
        return jdbcTemplate.query(
                "SELECT c.bill_id, b.bill_display, c.old_cash_amount, c.cash_amount, c.old_bank_amount, c.bank_amount, " +
                        "IFNULL(pt.type, 'Cash') AS bank_mode_name, IFNULL(u.user_name, '') AS user_name, c.date_time " +
                        "FROM prod_bill_payment_type_change c JOIN prod_bill b ON b.id = c.bill_id " +
                        "LEFT JOIN prod_bill_payment_type pt ON pt.id = c.bank_mode LEFT JOIN users u ON u.id = c.uid " +
                        "WHERE DATE(c.date_time) BETWEEN ? AND ? ORDER BY c.date_time DESC",
                (rs, i) -> {
                    PaymentChangeRow row = new PaymentChangeRow();
                    row.setBillId(rs.getLong("bill_id"));
                    row.setBillNo(rs.getString("bill_display"));
                    row.setOldCash(rs.getDouble("old_cash_amount"));
                    row.setNewCash(rs.getDouble("cash_amount"));
                    row.setOldBank(rs.getDouble("old_bank_amount"));
                    row.setNewBank(rs.getDouble("bank_amount"));
                    row.setBankMode(rs.getString("bank_mode_name"));
                    row.setUserName(rs.getString("user_name"));
                    row.setDateTime(String.valueOf(rs.getTimestamp("date_time")));
                    return row;
                },
                from, to
        );
    }

    public List<ExchangeReportRow> exchangeReport(String from, String to, Integer type) {
        String typeClause = "";
        if (type != null && type == 1) {
            typeClause = " AND pbe.old_prod_id <> pbe.new_prod_id ";
        } else if (type != null && type == 2) {
            typeClause = " AND pbe.old_prod_id = pbe.new_prod_id ";
        }
        return jdbcTemplate.query(
                "SELECT pbe.id, DATE_FORMAT(pbe.date_time,'%d-%m-%Y %H:%i') AS dt, pb.bill_display AS bill_no, " +
                        "IFNULL(c.name, 'Walk-in') AS customer_name, op.name AS old_prod_name, np.name AS new_prod_name, " +
                        "CASE WHEN pbe.old_prod_id = pbe.new_prod_id THEN 2 ELSE 1 END AS type, " +
                        "IFNULL((SELECT cep.exchange_point FROM customers_exchange_point cep WHERE cep.bill_id = pbe.bill_id AND cep.customer_id = pbe.customer_id ORDER BY cep.id DESC LIMIT 1), 0) AS points_earned, " +
                        "IFNULL(u.user_name, '-') AS staff_name " +
                        "FROM pro_bill_exchange pbe JOIN prod_bill pb ON pb.id = pbe.bill_id " +
                        "LEFT JOIN customers c ON c.id = pbe.customer_id " +
                        "JOIN prod_product op ON op.id = pbe.old_prod_id JOIN prod_product np ON np.id = pbe.new_prod_id " +
                        "LEFT JOIN users u ON u.id = pbe.uid " +
                        "WHERE DATE(pbe.date_time) BETWEEN ? AND ? " + typeClause + "ORDER BY pbe.date_time DESC",
                (rs, i) -> {
                    ExchangeReportRow row = new ExchangeReportRow();
                    row.setId(rs.getLong("id"));
                    row.setDateTime(rs.getString("dt"));
                    row.setBillNo(rs.getString("bill_no"));
                    row.setCustomer(rs.getString("customer_name"));
                    row.setOldProd(rs.getString("old_prod_name"));
                    row.setNewProd(rs.getString("new_prod_name"));
                    row.setType(rs.getInt("type"));
                    row.setPoints(rs.getDouble("points_earned"));
                    row.setStaff(rs.getString("staff_name"));
                    return row;
                },
                from, to
        );
    }

    private String validateCancel(Long billId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT b.customerId, b.currentBalance, COALESCE(ca.balance, 0) AS accountBalance " +
                        "FROM prod_bill b LEFT JOIN customer_account ca ON ca.customer_id = b.customerId " +
                        "WHERE b.id = ? AND b.is_cancelled = 0",
                billId
        );
        if (rows.isEmpty()) {
            return "Bill not found or already cancelled.";
        }
        long customerId = toL(rows.get(0).get("customerId"));
        double billDue = toD(rows.get(0).get("currentBalance"));
        double accountBalance = toD(rows.get(0).get("accountBalance"));
        if (customerId > 0 && billDue > 0.001 && accountBalance > billDue + 0.001) {
            return "Cannot cancel this bill. Bill due is " + String.format("%.2f", billDue)
                    + " but customer account balance is " + String.format("%.2f", accountBalance)
                    + ". Clear or adjust the customer account balance first.";
        }
        return null;
    }

    private void restoreStock(Long prodId, BigDecimal qty, Long uid, Long billId, String notes) {
        Long batchId = latestBatch(prodId);
        if (batchId == null) {
            throw new RuntimeException("No batch found for product id: " + prodId);
        }
        jdbcTemplate.update("UPDATE prod_batch SET stock = stock + ? WHERE id = ?", qty, batchId);
        jdbcTemplate.update(
                "INSERT INTO prod_lifecycle (batch_id, product_id, stock_in, stock_out, stock_now, notes, date, time, uid, stock_type, stockAdjType) " +
                        "VALUES (?, ?, ?, 0, ?, ?, CURDATE(), CURTIME(), ?, 1, 1)",
                batchId, prodId, qty, lastStockNow(prodId).add(qty), notes, uid
        );
    }

    private Long latestBatch(Long productId) {
        return jdbcTemplate.query(
                "SELECT id FROM prod_batch WHERE product_id = ? ORDER BY id DESC LIMIT 1",
                rs -> rs.next() ? rs.getLong(1) : null,
                productId
        );
    }

    private BigDecimal lastStockNow(Long productId) {
        BigDecimal value = jdbcTemplate.query(
                "SELECT stock_now FROM prod_lifecycle WHERE product_id = ? ORDER BY id DESC LIMIT 1",
                rs -> rs.next() ? rs.getBigDecimal(1) : BigDecimal.ZERO,
                productId
        );
        return value == null ? BigDecimal.ZERO : value;
    }

    private double scale(BigDecimal value) {
        return value.setScale(3, RoundingMode.HALF_UP).doubleValue();
    }

    private String required(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new RuntimeException(message);
        }
        return value.trim();
    }

    private String nz(String value) {
        return value == null ? "" : value;
    }

    private double nz(Double value) {
        return value == null ? 0 : value;
    }

    private String asStr(Object value) {
        return value == null ? "" : value.toString();
    }

    private double toD(Object value) {
        if (value == null) return 0;
        if (value instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private long toL(Object value) {
        if (value == null) return 0;
        if (value instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private BigDecimal toBd(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal bd) return bd;
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return new BigDecimal(value.toString());
    }
}
