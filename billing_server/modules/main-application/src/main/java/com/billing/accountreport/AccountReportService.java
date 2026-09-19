package com.billing.accountreport;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AccountReportService {

    private static final String PROD_LEDGER_VALID =
            " (pl.bill_type NOT IN (1,5,9,11) "
                    + " OR (pl.bill_type = 1 AND EXISTS (SELECT 1 FROM prod_bill x WHERE x.id = pl.bill_id AND x.is_cancelled = 0)) "
                    + " OR (pl.bill_type = 5 AND EXISTS (SELECT 1 FROM prod_purchase x WHERE x.id = pl.bill_id AND x.is_cancelled = 0 AND x.is_po = 0)) "
                    + " OR (pl.bill_type = 9 AND EXISTS (SELECT 1 FROM expense_entry x WHERE x.id = pl.bill_id AND x.is_active = 1)) "
                    + " OR (pl.bill_type = 11 AND EXISTS (SELECT 1 FROM daybook_opening_balance x WHERE x.id = pl.bill_id AND x.is_active = 1))) ";

    private final JdbcTemplate jdbcTemplate;

    public Map<String, Object> sales(String from, String to, Integer mode, Integer type, Long userId) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        int modeId = mode == null ? 0 : mode;
        int typeId = type == null ? 0 : type;
        long uid = userId == null ? 0 : userId;

        String sql = "SELECT a.bill_display, a.total, a.prodDisc + a.extraDisc AS discount, a.payable, a.paid, a.date, a.time, b.user_name, "
                + "a.id, CASE WHEN a.paymentMode = 3 THEN CONCAT('CASH & ', MAX(d.type)) ELSE MAX(d.type) END AS pay_type, "
                + "SUM(c.cash) AS cash, SUM(c.bank) AS bank, a.balance, a.currentBalance, a.cusName, a.cusPhn "
                + "FROM prod_bill a "
                + "JOIN users b ON b.id = a.uid "
                + "JOIN prod_bill_payment c ON c.bill_id = a.id "
                + "JOIN prod_bill_payment_type d ON d.id = c.paymentType "
                + "WHERE a.is_cancelled = 0 AND a.date BETWEEN ? AND ? ";
        List<Object> args = new ArrayList<>();
        args.add(fromDate);
        args.add(toDate);
        if (modeId == 1) {
            sql += "AND a.paymentMode IN (1, 3) ";
        } else if (modeId == 2) {
            sql += "AND a.paymentMode IN (2, 3) ";
            if (typeId > 0) {
                sql += "AND c.paymentType = ? ";
                args.add(typeId);
            }
        }
        if (uid > 0) {
            sql += "AND a.uid = ? ";
            args.add(uid);
        }
        sql += "GROUP BY a.id, a.bill_display, a.total, a.prodDisc, a.extraDisc, a.payable, a.paid, a.date, a.time, "
                + "b.user_name, a.balance, a.currentBalance, a.cusName, a.cusPhn, a.paymentMode";

        List<Map<String, Object>> bills = jdbcTemplate.query(sql, (rs, i) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("billNo", nz(rs.getString("bill_display")));
            row.put("billId", rs.getLong("id"));
            row.put("total", rs.getDouble("total"));
            row.put("discount", rs.getDouble("discount"));
            row.put("payable", rs.getDouble("payable"));
            row.put("paid", rs.getDouble("paid"));
            row.put("cash", rs.getDouble("cash"));
            row.put("bank", rs.getDouble("bank"));
            row.put("balance", rs.getDouble("balance"));
            row.put("pendingBalance", rs.getDouble("currentBalance"));
            row.put("date", asStr(rs.getObject("date")));
            row.put("time", asStr(rs.getObject("time")));
            row.put("biller", nz(rs.getString("user_name")));
            row.put("customer", nz(rs.getString("cusName")));
            row.put("phone", nz(rs.getString("cusPhn")));
            row.put("payType", nz(rs.getString("pay_type")));
            return row;
        }, args.toArray());

        String dueSql = "SELECT c.name, a.balance, a.cash_paid, a.bank_paid, "
                + "CASE WHEN a.pay_mode = 1 THEN 'Cash' ELSE 'Bank' END AS mode, "
                + "CASE WHEN a.pay_type = 0 THEN '-' WHEN a.pay_type = 1 THEN 'UPI' WHEN a.pay_type = 2 THEN 'DEBIT CARD' "
                + "WHEN a.pay_type = 3 THEN 'CREDIT CARD' WHEN a.pay_type = 4 THEN 'NEFT' WHEN a.pay_type = 5 THEN 'WALLET' END AS bank, "
                + "a.date, a.time, u.user_name "
                + "FROM prod_bill_due a JOIN customers c ON a.customer_id = c.id JOIN users u ON a.uid = u.id "
                + "WHERE a.date BETWEEN ? AND ? ";
        List<Object> dueArgs = new ArrayList<>();
        dueArgs.add(fromDate);
        dueArgs.add(toDate);
        if (uid > 0) {
            dueSql += "AND a.uid = ? ";
            dueArgs.add(uid);
        }
        dueSql += "ORDER BY a.date, a.time";
        List<Map<String, Object>> dues = jdbcTemplate.query(dueSql, (rs, i) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("customer", nz(rs.getString("name")));
            row.put("balance", rs.getDouble("balance"));
            row.put("cashPaid", rs.getDouble("cash_paid"));
            row.put("bankPaid", rs.getDouble("bank_paid"));
            row.put("mode", nz(rs.getString("mode")));
            row.put("bankOption", nz(rs.getString("bank")));
            row.put("date", asStr(rs.getObject("date")));
            row.put("time", asStr(rs.getObject("time")));
            row.put("biller", nz(rs.getString("user_name")));
            return row;
        }, dueArgs.toArray());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("bills", bills);
        data.put("dues", dues);
        return data;
    }

    public List<Map<String, Object>> lineSales(String from, String to, String dimension, Long id) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        if (id == null || id <= 0) {
            throw new RuntimeException("Please select a filter");
        }
        String filter = switch (dimension) {
            case "category" -> "e.id = ?";
            case "brand" -> "f.id = ?";
            case "product" -> "d.id = ?";
            default -> throw new RuntimeException("Invalid sales filter");
        };
        String sql = "SELECT a.bill_display, c.qty, c.price, c.disc, c.total, a.date, a.time, b.user_name, a.id, "
                + "d.name AS product_name, e.name AS category_name, f.name AS brand_name, "
                + "a.paid, a.balance, a.currentBalance, a.cusName "
                + "FROM prod_bill a "
                + "JOIN users b ON b.id = a.uid "
                + "JOIN prod_bill_details c ON c.bill_id = a.id "
                + "JOIN prod_product d ON d.id = c.prod_id "
                + "JOIN prod_category e ON e.id = d.category_id "
                + "JOIN prod_brands f ON f.id = d.brand_id "
                + "WHERE a.is_cancelled = 0 AND a.date BETWEEN ? AND ? AND " + filter;
        return jdbcTemplate.query(sql, (rs, i) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("billNo", nz(rs.getString("bill_display")));
            row.put("billId", rs.getLong("id"));
            row.put("qty", rs.getDouble("qty"));
            row.put("price", rs.getDouble("price"));
            row.put("discount", rs.getDouble("disc"));
            row.put("total", rs.getDouble("total"));
            row.put("date", asStr(rs.getObject("date")));
            row.put("time", asStr(rs.getObject("time")));
            row.put("biller", nz(rs.getString("user_name")));
            row.put("productName", nz(rs.getString("product_name")));
            row.put("categoryName", nz(rs.getString("category_name")));
            row.put("brandName", nz(rs.getString("brand_name")));
            row.put("paid", rs.getDouble("paid"));
            row.put("balance", rs.getDouble("balance"));
            row.put("pendingBalance", rs.getDouble("currentBalance"));
            row.put("customer", nz(rs.getString("cusName")));
            return row;
        }, fromDate, toDate, id);
    }

    public List<Map<String, Object>> salesByCustomer(String from, String to, Long customerId) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        if (customerId == null || customerId <= 0) {
            throw new RuntimeException("Please select a customer");
        }
        return jdbcTemplate.query(
                "SELECT a.id, a.bill_display, a.total, (a.prodDisc + a.extraDisc) AS totalDiscount, "
                        + "a.payable, a.paid, a.balance, a.currentBalance, a.date, a.time, b.user_name "
                        + "FROM prod_bill a JOIN users b ON b.id = a.uid "
                        + "WHERE a.is_cancelled = 0 AND a.date BETWEEN ? AND ? AND a.customerId = ? "
                        + "ORDER BY a.date DESC, a.time DESC",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("billId", rs.getLong("id"));
                    row.put("billNo", nz(rs.getString("bill_display")));
                    row.put("total", rs.getDouble("total"));
                    row.put("discount", rs.getDouble("totalDiscount"));
                    row.put("payable", rs.getDouble("payable"));
                    row.put("paid", rs.getDouble("paid"));
                    row.put("balance", rs.getDouble("balance"));
                    row.put("pendingBalance", rs.getDouble("currentBalance"));
                    row.put("date", asStr(rs.getObject("date")));
                    row.put("time", asStr(rs.getObject("time")));
                    row.put("biller", nz(rs.getString("user_name")));
                    return row;
                },
                fromDate, toDate, customerId
        );
    }

    public List<Map<String, Object>> salesByAttender(String from, String to, Long attenderId) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        String sql = "SELECT a.bill_display, a.total, a.prodDisc + a.extraDisc AS discount, a.payable, a.paid, "
                + "a.date, a.time, a.cusName, a.currentBalance, IFNULL(att.name, 'No Attender') AS attender_name "
                + "FROM prod_bill a LEFT JOIN attender att ON att.id = a.attender_id "
                + "WHERE a.is_cancelled = 0 AND a.date BETWEEN ? AND ? ";
        List<Object> args = new ArrayList<>();
        args.add(fromDate);
        args.add(toDate);
        if (attenderId != null && attenderId > 0) {
            sql += "AND a.attender_id = ? ";
            args.add(attenderId);
        }
        sql += "ORDER BY a.date DESC, a.time DESC";
        return jdbcTemplate.query(sql, (rs, i) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("billNo", nz(rs.getString("bill_display")));
            row.put("total", rs.getDouble("total"));
            row.put("discount", rs.getDouble("discount"));
            row.put("payable", rs.getDouble("payable"));
            row.put("paid", rs.getDouble("paid"));
            row.put("date", asStr(rs.getObject("date")));
            row.put("time", asStr(rs.getObject("time")));
            row.put("customer", nz(rs.getString("cusName")));
            row.put("pendingBalance", rs.getDouble("currentBalance"));
            row.put("attender", nz(rs.getString("attender_name")));
            return row;
        }, args.toArray());
    }

    public Map<String, Object> dayAccount(String from, String to) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        List<Map<String, Object>> categories = jdbcTemplate.query(
                "SELECT e.id, e.name, COALESCE(SUM(CASE WHEN a.id IS NOT NULL THEN c.qty * c.price ELSE 0 END), 0) AS amount "
                        + "FROM prod_category e "
                        + "LEFT JOIN prod_product d ON d.category_id = e.id "
                        + "LEFT JOIN prod_bill_details c ON c.prod_id = d.id "
                        + "LEFT JOIN prod_bill a ON a.id = c.bill_id AND a.is_cancelled = 0 AND a.date BETWEEN ? AND ? "
                        + "WHERE e.is_active = 1 "
                        + "GROUP BY e.id, e.name ORDER BY e.name",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", rs.getLong("id"));
                    row.put("name", nz(rs.getString("name")));
                    row.put("amount", rs.getDouble("amount"));
                    return row;
                },
                fromDate, toDate
        );
        double collectionTotal = categories.stream().mapToDouble(r -> ((Number) r.get("amount")).doubleValue()).sum();
        double cash = sum("SELECT COALESCE(SUM(b.cash), 0) FROM prod_bill a JOIN prod_bill_payment b ON b.bill_id = a.id "
                + "WHERE a.is_cancelled = 0 AND a.date BETWEEN ? AND ?", fromDate, toDate);
        double bank = sum("SELECT COALESCE(SUM(b.bank), 0) FROM prod_bill a JOIN prod_bill_payment b ON b.bill_id = a.id "
                + "WHERE a.is_cancelled = 0 AND a.date BETWEEN ? AND ?", fromDate, toDate);
        double due = sum("SELECT COALESCE(SUM(a.balance), 0) FROM prod_bill a JOIN prod_bill_payment b ON b.bill_id = a.id "
                + "WHERE a.is_cancelled = 0 AND a.date BETWEEN ? AND ?", fromDate, toDate);
        double discount = sum("SELECT COALESCE(SUM(a.extraDisc + a.prodDisc), 0) FROM prod_bill a JOIN prod_bill_payment b ON b.bill_id = a.id "
                + "WHERE a.is_cancelled = 0 AND a.date BETWEEN ? AND ?", fromDate, toDate);
        double dueCash = sum("SELECT COALESCE(SUM(CASE WHEN a.mode = 1 THEN a.paid END), 0) FROM prod_bill_due_collection a WHERE a.date BETWEEN ? AND ?", fromDate, toDate);
        double dueBank = sum("SELECT COALESCE(SUM(CASE WHEN a.mode = 2 THEN a.paid END), 0) FROM prod_bill_due_collection a WHERE a.date BETWEEN ? AND ?", fromDate, toDate);
        double paymentTotal = cash + bank + due + discount;

        Map<String, Object> payments = new LinkedHashMap<>();
        payments.put("cash", cash);
        payments.put("bank", bank);
        payments.put("discount", discount);
        payments.put("due", due);
        payments.put("total", paymentTotal);

        Map<String, Object> dueCollections = new LinkedHashMap<>();
        dueCollections.put("cash", dueCash);
        dueCollections.put("bank", dueBank);
        dueCollections.put("total", dueCash + dueBank);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("categories", categories);
        data.put("collectionTotal", collectionTotal);
        data.put("payments", payments);
        data.put("dueCollections", dueCollections);
        data.put("difference", collectionTotal - paymentTotal);
        return data;
    }

    public Map<String, Object> dayBook(String from, String to) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        double cashOpening = ledgerBalanceBefore(fromDate, true);
        double bankOpening = ledgerBalanceBefore(fromDate, false);

        List<Map<String, Object>> cashBook = jdbcTemplate.query(
                "SELECT COALESCE(bt.type, CONCAT('Type ', pl.bill_type)) AS category, "
                        + "SUM(CASE WHEN pl.bill_type IN (1,2,3,8,11) THEN pl.cash_paid ELSE 0 END) AS cash_in, "
                        + "SUM(CASE WHEN pl.bill_type IN (5,6,7,9) THEN pl.cash_paid ELSE 0 END) AS cash_out "
                        + "FROM prod_ledger pl LEFT JOIN bill_type bt ON bt.id = pl.bill_type "
                        + "WHERE DATE(pl.date_time) BETWEEN ? AND ? AND " + PROD_LEDGER_VALID
                        + " GROUP BY pl.bill_type, bt.type "
                        + "HAVING cash_in <> 0 OR cash_out <> 0 "
                        + "ORDER BY CASE pl.bill_type WHEN 11 THEN 0 ELSE pl.bill_type END, pl.bill_type",
                (rs, i) -> bookRow(rs.getString("category"), rs.getDouble("cash_in"), rs.getDouble("cash_out")),
                fromDate, toDate
        );
        List<Map<String, Object>> bankBook = jdbcTemplate.query(
                "SELECT COALESCE(bt.type, CONCAT('Type ', pl.bill_type)) AS category, "
                        + "SUM(CASE WHEN pl.bill_type IN (1,2,3,8,11) THEN pl.bank_paid ELSE 0 END) AS bank_in, "
                        + "SUM(CASE WHEN pl.bill_type IN (5,6,7,9) THEN pl.bank_paid ELSE 0 END) AS bank_out "
                        + "FROM prod_ledger pl LEFT JOIN bill_type bt ON bt.id = pl.bill_type "
                        + "WHERE DATE(pl.date_time) BETWEEN ? AND ? AND " + PROD_LEDGER_VALID
                        + " GROUP BY pl.bill_type, bt.type "
                        + "HAVING bank_in <> 0 OR bank_out <> 0 "
                        + "ORDER BY CASE pl.bill_type WHEN 11 THEN 0 ELSE pl.bill_type END, pl.bill_type",
                (rs, i) -> bookRow(rs.getString("category"), rs.getDouble("bank_in"), rs.getDouble("bank_out")),
                fromDate, toDate
        );
        List<Map<String, Object>> detail = jdbcTemplate.query(
                "SELECT COALESCE(bt.type, CONCAT('Type ', pl.bill_type)) AS category, "
                        + "SUM(CASE WHEN pl.bill_type IN (1,2,3,5,6,7,9,11) THEN pl.cash_paid WHEN pl.bill_type = 8 THEN 0 ELSE 0 END) AS cash_amt, "
                        + "SUM(CASE WHEN pl.bill_type IN (1,5) THEN GREATEST(pl.bill_amount - pl.cash_paid - pl.bank_paid, 0) "
                        + "WHEN pl.bill_type IN (4,12) THEN pl.bill_amount WHEN pl.bill_type = 8 THEN -pl.bill_amount ELSE 0 END) AS credit_amt, "
                        + "SUM(CASE WHEN pl.bill_type IN (1,2,3,5,6,7,9,11) THEN pl.bank_paid WHEN pl.bill_type = 8 THEN 0 ELSE 0 END) AS bank_amt, "
                        + "SUM(CASE WHEN pl.bill_type = 8 THEN -pl.bill_amount ELSE pl.bill_amount END) AS total_amt "
                        + "FROM prod_ledger pl LEFT JOIN bill_type bt ON bt.id = pl.bill_type "
                        + "WHERE DATE(pl.date_time) BETWEEN ? AND ? AND " + PROD_LEDGER_VALID
                        + " GROUP BY pl.bill_type, bt.type "
                        + "HAVING cash_amt <> 0 OR credit_amt <> 0 OR bank_amt <> 0 OR total_amt <> 0 "
                        + "ORDER BY CASE pl.bill_type WHEN 11 THEN 0 ELSE pl.bill_type END, pl.bill_type",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("category", nz(rs.getString("category")));
                    row.put("cash", rs.getDouble("cash_amt"));
                    row.put("credit", rs.getDouble("credit_amt"));
                    row.put("bank", rs.getDouble("bank_amt"));
                    row.put("total", rs.getDouble("total_amt"));
                    return row;
                },
                fromDate, toDate
        );
        List<Map<String, Object>> sales = jdbcTemplate.query(
                "SELECT a.date, a.bill_display, "
                        + "CASE WHEN a.is_cancelled = 1 THEN 'Cancelled' ELSE 'Active' END AS bill_status, "
                        + "CASE WHEN a.balance > 0 AND COALESCE(a.paid, 0) = 0 THEN 'Due' "
                        + "WHEN a.balance > 0 THEN CONCAT(CASE WHEN a.paymentMode = 1 THEN 'Cash' WHEN a.paymentMode = 2 THEN 'Bank' "
                        + "WHEN a.paymentMode = 3 THEN 'Mixed' ELSE 'Paid' END, ' + Due') "
                        + "WHEN a.paymentMode = 1 THEN 'Cash' WHEN a.paymentMode = 2 THEN 'Bank' "
                        + "WHEN a.paymentMode = 3 THEN 'Mixed' ELSE '-' END AS sale_type, "
                        + "COALESCE(a.cusName, '-') AS customer_name, a.payable "
                        + "FROM prod_bill a WHERE a.date BETWEEN ? AND ? ORDER BY a.date, a.time, a.bill_display",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("date", asStr(rs.getObject("date")));
                    row.put("billNo", nz(rs.getString("bill_display")));
                    row.put("status", nz(rs.getString("bill_status")));
                    row.put("saleType", nz(rs.getString("sale_type")));
                    row.put("customer", nz(rs.getString("customer_name")));
                    row.put("payable", rs.getDouble("payable"));
                    return row;
                },
                fromDate, toDate
        );

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("cashOpening", cashOpening);
        data.put("bankOpening", bankOpening);
        data.put("cashBook", cashBook);
        data.put("bankBook", bankBook);
        data.put("detail", detail);
        data.put("sales", sales);
        return data;
    }

    public List<Map<String, Object>> openingBalances() {
        return jdbcTemplate.query(
                "SELECT ob.id, ob.balance_date, ob.amount, COALESCE(ob.notes, '') AS notes, "
                        + "COALESCE(u.user_name, '') AS user_name, ob.entry_date, ob.entry_time, "
                        + "COALESCE(pl.payment_mode, 1) AS pay_mode, COALESCE(pl.cash_paid, ob.amount) AS cash_paid, "
                        + "COALESCE(pl.bank_paid, 0) AS bank_paid "
                        + "FROM daybook_opening_balance ob "
                        + "LEFT JOIN users u ON u.id = ob.uid "
                        + "LEFT JOIN prod_ledger pl ON pl.bill_type = 11 AND pl.bill_id = ob.id "
                        + "WHERE ob.is_active = 1 ORDER BY ob.balance_date DESC, ob.id DESC LIMIT 50",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", rs.getLong("id"));
                    row.put("balanceDate", asStr(rs.getObject("balance_date")));
                    row.put("amount", rs.getDouble("amount"));
                    row.put("notes", nz(rs.getString("notes")));
                    row.put("userName", nz(rs.getString("user_name")));
                    row.put("entryDate", asStr(rs.getObject("entry_date")));
                    row.put("entryTime", asStr(rs.getObject("entry_time")));
                    row.put("payMode", rs.getInt("pay_mode"));
                    row.put("cashPaid", rs.getDouble("cash_paid"));
                    row.put("bankPaid", rs.getDouble("bank_paid"));
                    return row;
                }
        );
    }

    @Transactional
    public boolean saveOpeningBalance(OpeningBalanceRequest request, Long uid) {
        String balanceDate = required(request == null ? null : request.getBalanceDate(), "Please enter date and amount.");
        double amount = nz(request.getAmount());
        if (amount <= 0) {
            throw new RuntimeException("Please enter date and amount.");
        }
        int payMode = request.getPayMode() == null ? 1 : request.getPayMode();
        int payType = request.getPayType() == null ? 0 : request.getPayType();
        double cashPaid = nz(request.getCashPaid());
        double bankPaid = nz(request.getBankPaid());
        if (payMode < 1 || payMode > 3) {
            throw new RuntimeException("Invalid pay mode");
        }
        if (payMode == 1) {
            payType = 0;
            bankPaid = 0;
        } else if (payType < 1 || payType > 5) {
            throw new RuntimeException("Please select a pay type");
        }
        if (Math.abs((cashPaid + bankPaid) - amount) > 0.01) {
            throw new RuntimeException("Cash + Bank must equal the amount.");
        }
        String notes = request.getNotes() == null ? "" : request.getNotes().trim();
        String ledgerDateTime = balanceDate + " " + LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"));

        KeyHolder keys = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO daybook_opening_balance (balance_date, amount, notes, uid, entry_date, entry_time, is_active) "
                            + "VALUES (?, ?, ?, ?, CURDATE(), CURTIME(), 1)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, balanceDate);
            ps.setDouble(2, amount);
            ps.setString(3, notes);
            ps.setLong(4, uid);
            return ps;
        }, keys);
        Number key = keys.getKey();
        if (key == null) {
            throw new RuntimeException("Opening balance was not saved. No row inserted.");
        }
        jdbcTemplate.update(
                "INSERT INTO prod_ledger (bill_type, bill_id, customer_id, supplier_id, payment_mode, bill_amount, cash_paid, bank_paid, payment_type, uid, date_time) "
                        + "VALUES (11, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?)",
                key.longValue(), payMode, amount, cashPaid, bankPaid, payType, uid, ledgerDateTime
        );
        return true;
    }

    public List<Map<String, Object>> commission(String from, String to, Long customerId) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        if (customerId == null || customerId <= 0) {
            throw new RuntimeException("Please select a customer");
        }
        return jdbcTemplate.query(
                "SELECT a.bill_display, DATE(a.date) AS bill_date, p.name AS product_name, "
                        + "d.qty, d.price, d.disc, d.total, IFNULL(d.commission, 0) AS commission_per_unit, "
                        + "IFNULL(d.commission, 0) * d.qty AS commission_amount "
                        + "FROM prod_bill a JOIN prod_bill_details d ON d.bill_id = a.id JOIN prod_product p ON p.id = d.prod_id "
                        + "WHERE a.is_cancelled = 0 AND a.customerId = ? AND DATE(a.date) BETWEEN ? AND ? "
                        + "ORDER BY a.date, a.id, d.id",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("billNo", nz(rs.getString("bill_display")));
                    row.put("date", asStr(rs.getObject("bill_date")));
                    row.put("productName", nz(rs.getString("product_name")));
                    row.put("qty", rs.getDouble("qty"));
                    row.put("price", rs.getDouble("price"));
                    row.put("discount", rs.getDouble("disc"));
                    row.put("total", rs.getDouble("total"));
                    row.put("commissionPerUnit", rs.getDouble("commission_per_unit"));
                    row.put("commissionAmount", rs.getDouble("commission_amount"));
                    return row;
                },
                customerId, fromDate, toDate
        );
    }

    public List<Map<String, Object>> commissionCustomers() {
        return jdbcTemplate.query(
                "SELECT id, name FROM customers WHERE is_active = 1 AND is_eligible_for_commission = 1 ORDER BY name",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", rs.getLong("id"));
                    row.put("name", nz(rs.getString("name")));
                    return row;
                }
        );
    }

    public List<Map<String, Object>> gstSalesSummary(String from, String to) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        return jdbcTemplate.query(
                "SELECT a.gst AS gst_rate, SUM(a.total / (1 + a.gst / 100)) AS taxable_value, "
                        + "a.gst / 2 AS sgst_percent, SUM((a.total / (1 + a.gst / 100)) * a.gst / 200) AS sgst_amount, "
                        + "a.gst / 2 AS cgst_percent, SUM((a.total / (1 + a.gst / 100)) * a.gst / 200) AS cgst_amount, "
                        + "SUM((a.total / (1 + a.gst / 100)) * a.gst / 100) AS total_gst, SUM(a.total) AS total, SUM(a.total) AS invoice_total "
                        + "FROM prod_bill_details a JOIN prod_bill b ON a.bill_id = b.id "
                        + "WHERE b.is_cancelled = 0 AND a.is_cancelled = 0 AND b.date BETWEEN ? AND ? "
                        + "GROUP BY a.gst ORDER BY a.gst",
                (rs, i) -> gstSummaryRow(rs),
                fromDate, toDate
        );
    }

    public List<Map<String, Object>> gstBillWise(String from, String to) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        return jdbcTemplate.query(
                "SELECT b.bill_display, b.date, b.cusName, "
                        + "CASE WHEN c.gstin IS NULL OR c.gstin = '' THEN 'NA' ELSE c.gstin END AS gstin, "
                        + "SUM(bd.total / (1 + bd.gst / 100)) AS taxable_amount, "
                        + "SUM((bd.total - bd.total / (1 + bd.gst / 100)) / 2) AS cgst, "
                        + "SUM((bd.total - bd.total / (1 + bd.gst / 100)) / 2) AS sgst, "
                        + "SUM(bd.total - bd.total / (1 + bd.gst / 100)) AS total_gst, "
                        + "SUM(bd.total) AS invoice_value "
                        + "FROM prod_bill b JOIN prod_bill_details bd ON b.id = bd.bill_id "
                        + "LEFT JOIN customers c ON b.customerId = c.id "
                        + "WHERE b.date BETWEEN ? AND ? AND b.is_cancelled = 0 AND bd.is_cancelled = 0 "
                        + "GROUP BY b.id, b.bill_display, b.date, b.cusName, c.gstin "
                        + "ORDER BY b.date DESC, b.bill_display",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("billNo", nz(rs.getString("bill_display")));
                    row.put("date", asStr(rs.getObject("date")));
                    row.put("customer", nz(rs.getString("cusName")));
                    row.put("gstin", nz(rs.getString("gstin")));
                    row.put("taxable", rs.getDouble("taxable_amount"));
                    row.put("cgst", rs.getDouble("cgst"));
                    row.put("sgst", rs.getDouble("sgst"));
                    row.put("totalGst", rs.getDouble("total_gst"));
                    row.put("invoiceValue", rs.getDouble("invoice_value"));
                    return row;
                },
                fromDate, toDate
        );
    }

    public List<Map<String, Object>> gstItemWise(String from, String to) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        return jdbcTemplate.query(
                "SELECT b.bill_display, b.date, b.cusName, p.name AS item_name, "
                        + "CASE WHEN p.hsn IS NULL OR p.hsn = 0 THEN 'N/A' ELSE CAST(p.hsn AS CHAR) END AS hsn_code, "
                        + "bd.gst AS gst_rate, bd.qty, bd.price, bd.total AS gross_amount, "
                        + "bd.total / (1 + bd.gst / 100) AS taxable_amount, "
                        + "(bd.total - bd.total / (1 + bd.gst / 100)) / 2 AS cgst, "
                        + "(bd.total - bd.total / (1 + bd.gst / 100)) / 2 AS sgst, "
                        + "(bd.total - bd.total / (1 + bd.gst / 100)) AS total_gst "
                        + "FROM prod_bill b JOIN prod_bill_details bd ON b.id = bd.bill_id JOIN prod_product p ON bd.prod_id = p.id "
                        + "WHERE b.date BETWEEN ? AND ? AND b.is_cancelled = 0 AND bd.is_cancelled = 0 "
                        + "ORDER BY b.date DESC, b.bill_display, p.name",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("billNo", nz(rs.getString("bill_display")));
                    row.put("date", asStr(rs.getObject("date")));
                    row.put("customer", nz(rs.getString("cusName")));
                    row.put("itemName", nz(rs.getString("item_name")));
                    row.put("hsn", nz(rs.getString("hsn_code")));
                    row.put("gstRate", rs.getDouble("gst_rate"));
                    row.put("qty", rs.getDouble("qty"));
                    row.put("price", rs.getDouble("price"));
                    row.put("gross", rs.getDouble("gross_amount"));
                    row.put("taxable", rs.getDouble("taxable_amount"));
                    row.put("cgst", rs.getDouble("cgst"));
                    row.put("sgst", rs.getDouble("sgst"));
                    row.put("totalGst", rs.getDouble("total_gst"));
                    return row;
                },
                fromDate, toDate
        );
    }

    public List<Map<String, Object>> gstHsn(String from, String to) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        return jdbcTemplate.query(
                "SELECT CASE WHEN p.hsn IS NULL OR p.hsn = 0 THEN 'N/A' ELSE CAST(p.hsn AS CHAR) END AS hsn_code, "
                        + "GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR ', ') AS description, "
                        + "bd.gst AS gst_rate, SUM(bd.qty) AS total_qty, "
                        + "SUM(bd.total / (1 + bd.gst / 100)) AS taxable_amount, "
                        + "SUM((bd.total - bd.total / (1 + bd.gst / 100)) / 2) AS cgst, "
                        + "SUM((bd.total - bd.total / (1 + bd.gst / 100)) / 2) AS sgst, "
                        + "SUM(bd.total - bd.total / (1 + bd.gst / 100)) AS total_gst, "
                        + "SUM(bd.total) AS total_value "
                        + "FROM prod_bill b JOIN prod_bill_details bd ON b.id = bd.bill_id JOIN prod_product p ON bd.prod_id = p.id "
                        + "WHERE b.date BETWEEN ? AND ? AND b.is_cancelled = 0 AND bd.is_cancelled = 0 "
                        + "GROUP BY CASE WHEN p.hsn IS NULL OR p.hsn = 0 THEN 'N/A' ELSE CAST(p.hsn AS CHAR) END, bd.gst "
                        + "ORDER BY hsn_code, bd.gst",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("hsn", nz(rs.getString("hsn_code")));
                    row.put("description", nz(rs.getString("description")));
                    row.put("gstRate", rs.getDouble("gst_rate"));
                    row.put("qty", rs.getDouble("total_qty"));
                    row.put("taxable", rs.getDouble("taxable_amount"));
                    row.put("cgst", rs.getDouble("cgst"));
                    row.put("sgst", rs.getDouble("sgst"));
                    row.put("totalGst", rs.getDouble("total_gst"));
                    row.put("totalValue", rs.getDouble("total_value"));
                    return row;
                },
                fromDate, toDate
        );
    }

    public List<Map<String, Object>> gstPurchase(String from, String to) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        return jdbcTemplate.query(
                "SELECT p.invno AS invoice_no, s.name AS supplier_name, p.invdate AS invoice_date, prod.name AS item_description, "
                        + "pd.netamt AS purchase_amount, pd.totalamt AS taxable_amount, pd.tax AS gst_rate, "
                        + "pd.cgst_amt AS cgst_amount, pd.sgst_amt AS sgst_amount, pd.igst_amt AS igst_amount, "
                        + "pd.netamt AS total_amount "
                        + "FROM prod_purchase p "
                        + "JOIN prod_purchase_details pd ON p.id = pd.prid "
                        + "JOIN prod_product prod ON pd.prods_id = prod.id "
                        + "JOIN prod_supplier s ON p.deal_id = s.id "
                        + "WHERE p.ent_date BETWEEN ? AND ? AND p.is_cancelled = 0 AND p.is_po = 0 "
                        + "ORDER BY p.invdate DESC, p.invno",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("invoiceNo", nz(rs.getString("invoice_no")));
                    row.put("supplier", nz(rs.getString("supplier_name")));
                    row.put("invoiceDate", asStr(rs.getObject("invoice_date")));
                    row.put("itemName", nz(rs.getString("item_description")));
                    row.put("purchaseAmount", rs.getDouble("purchase_amount"));
                    row.put("taxable", rs.getDouble("taxable_amount"));
                    row.put("gstRate", rs.getDouble("gst_rate"));
                    row.put("cgst", rs.getDouble("cgst_amount"));
                    row.put("sgst", rs.getDouble("sgst_amount"));
                    row.put("igst", rs.getDouble("igst_amount"));
                    row.put("total", rs.getDouble("total_amount"));
                    return row;
                },
                fromDate, toDate
        );
    }

    public List<Map<String, Object>> gstPurchaseSummary(String from, String to) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        return jdbcTemplate.query(
                "SELECT pd.tax AS gst_rate, SUM(pd.totalamt) AS taxable_value, "
                        + "MAX(pd.sgst_per) AS sgst_percent, SUM(pd.sgst_amt) AS sgst_amount, "
                        + "MAX(pd.cgst_per) AS cgst_percent, SUM(pd.cgst_amt) AS cgst_amount, "
                        + "SUM(pd.sgst_amt + pd.cgst_amt + pd.igst_amt) AS total_gst, SUM(pd.netamt) AS total, SUM(p.total) AS invoice_total "
                        + "FROM prod_purchase_details pd JOIN prod_purchase p ON pd.prid = p.id "
                        + "WHERE p.is_cancelled = 0 AND p.is_po = 0 AND p.ent_date BETWEEN ? AND ? "
                        + "GROUP BY pd.tax ORDER BY pd.tax",
                (rs, i) -> gstSummaryRow(rs),
                fromDate, toDate
        );
    }

    private Map<String, Object> gstSummaryRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("gstRate", rs.getDouble("gst_rate"));
        row.put("taxable", rs.getDouble("taxable_value"));
        row.put("sgstPercent", rs.getDouble("sgst_percent"));
        row.put("sgst", rs.getDouble("sgst_amount"));
        row.put("cgstPercent", rs.getDouble("cgst_percent"));
        row.put("cgst", rs.getDouble("cgst_amount"));
        row.put("totalGst", rs.getDouble("total_gst"));
        row.put("total", rs.getDouble("total"));
        row.put("invoiceTotal", rs.getDouble("invoice_total"));
        return row;
    }

    private Map<String, Object> bookRow(String category, double inAmt, double outAmt) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("category", nz(category));
        row.put("inAmt", inAmt);
        row.put("outAmt", outAmt);
        return row;
    }

    private double ledgerBalanceBefore(String beforeDate, boolean cash) {
        String col = cash ? "pl.cash_paid" : "pl.bank_paid";
        String sql = "SELECT COALESCE(SUM(CASE "
                + "WHEN pl.bill_type IN (1,2,3,11) THEN " + col + " "
                + "WHEN pl.bill_type IN (5,6,7,9) THEN -" + col + " "
                + "WHEN pl.bill_type = 8 THEN " + col + " "
                + "ELSE 0 END), 0) AS bal "
                + "FROM prod_ledger pl WHERE DATE(pl.date_time) < ? AND " + PROD_LEDGER_VALID;
        Double value = jdbcTemplate.query(sql, rs -> rs.next() ? rs.getDouble("bal") : 0d, beforeDate);
        return value == null ? 0 : value;
    }

    private double sum(String sql, Object... args) {
        Double value = jdbcTemplate.query(sql, rs -> rs.next() ? rs.getDouble(1) : 0d, args);
        return value == null ? 0 : value;
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
}
