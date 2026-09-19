package com.billing.credit;

import com.billing.credit.dto.AccountEntryRequest;
import com.billing.credit.dto.AccountEntryResult;
import com.billing.credit.dto.AccountTotalsData;
import com.billing.credit.dto.CreditAccountData;
import com.billing.credit.dto.CreditSummaryData;
import com.billing.credit.dto.DuePartyData;
import com.billing.credit.dto.PartySearchData;
import com.billing.credit.dto.TimelineRow;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Time;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CreditService {

    private final JdbcTemplate jdbcTemplate;

    public CreditSummaryData customerSummary() {
        CreditSummaryData data = new CreditSummaryData();
        data.setTotals(queryTotals("customer_account"));
        data.setDueList(jdbcTemplate.query(
                "SELECT a.customer_id, b.name, b.phone_number, a.balance " +
                        "FROM customer_account a JOIN customers b ON b.id = a.customer_id " +
                        "WHERE a.balance > 0 ORDER BY a.balance DESC",
                this::mapDueParty
        ));
        return data;
    }

    public CreditSummaryData supplierSummary() {
        CreditSummaryData data = new CreditSummaryData();
        data.setTotals(queryTotals("supplier_account"));
        data.setDueList(jdbcTemplate.query(
                "SELECT a.supplier_id, b.name, b.phone_number, a.balance " +
                        "FROM supplier_account a JOIN prod_supplier b ON b.id = a.supplier_id " +
                        "WHERE a.balance > 0 ORDER BY a.balance DESC",
                this::mapDueParty
        ));
        return data;
    }

    public List<PartySearchData> searchCustomers(String query, String phone) {
        String term = phone != null && !phone.isBlank() ? phone.trim() : (query == null ? "" : query.trim());
        if (term.isEmpty()) {
            return List.of();
        }
        boolean byPhone = phone != null && !phone.isBlank() || term.chars().allMatch(Character::isDigit);
        String where = byPhone ? "phone_number LIKE ?" : "name LIKE ?";
        return jdbcTemplate.query(
                "SELECT id, name, CASE WHEN phone_number = '' OR phone_number IS NULL THEN '-' ELSE phone_number END AS phone_number " +
                        "FROM customers WHERE is_active = 1 AND " + where + " ORDER BY name LIMIT 10",
                (rs, i) -> {
                    PartySearchData row = new PartySearchData();
                    row.setId(rs.getLong("id"));
                    row.setName(rs.getString("name"));
                    row.setPhone(rs.getString("phone_number"));
                    return row;
                },
                "%" + term + "%"
        );
    }

    public List<PartySearchData> searchSuppliers(String query) {
        String term = query == null ? "" : query.trim();
        if (term.isEmpty()) {
            return List.of();
        }
        return jdbcTemplate.query(
                "SELECT id, name, CASE WHEN phone_number = '' OR phone_number IS NULL THEN '-' ELSE phone_number END AS phone_number " +
                        "FROM prod_supplier WHERE is_active = 1 AND (name LIKE ? OR phone_number LIKE ?) ORDER BY name LIMIT 10",
                (rs, i) -> {
                    PartySearchData row = new PartySearchData();
                    row.setId(rs.getLong("id"));
                    row.setName(rs.getString("name"));
                    row.setPhone(rs.getString("phone_number"));
                    return row;
                },
                "%" + term + "%",
                "%" + term + "%"
        );
    }

    public CreditAccountData customerAccount(Long customerId) {
        List<Map<String, Object>> info = jdbcTemplate.queryForList(
                "SELECT name, CASE WHEN phone_number = '' OR phone_number IS NULL THEN '-' ELSE phone_number END AS phone_number " +
                        "FROM customers WHERE id = ?",
                customerId
        );
        if (info.isEmpty()) {
            throw new RuntimeException("Customer not found");
        }
        CreditAccountData data = new CreditAccountData();
        data.setId(customerId);
        data.setName(String.valueOf(info.get(0).get("name")));
        data.setPhone(String.valueOf(info.get(0).get("phone_number")));

        List<Map<String, Object>> acc = jdbcTemplate.queryForList(
                "SELECT advance, balance FROM customer_account WHERE customer_id = ?",
                customerId
        );
        data.setAdvance(acc.isEmpty() ? 0d : toDouble(acc.get(0).get("advance")));
        data.setBalance(acc.isEmpty() ? 0d : toDouble(acc.get(0).get("balance")));

        List<TimelineRow> timeline = new ArrayList<>();
        List<TimelineRow> bills = jdbcTemplate.query(
                "SELECT a.payable, a.paid, a.balance, a.date, a.time, b.user_name, a.bill_display, a.id " +
                        "FROM prod_bill a, users b " +
                        "WHERE a.uid = b.id AND a.customerId = ? AND a.is_cancelled = 0 ORDER BY a.id DESC",
                (rs, i) -> {
                    TimelineRow row = new TimelineRow();
                    row.setType("BILL");
                    row.setDocNo(nz(rs.getString("bill_display")));
                    row.setAmount(rs.getDouble("payable"));
                    row.setPaid(rs.getDouble("paid"));
                    row.setPending(rs.getDouble("balance"));
                    row.setDate(asDate(rs.getDate("date")));
                    row.setTime(asTime(rs.getTime("time")));
                    row.setUserName(nz(rs.getString("user_name")));
                    row.setRefId(rs.getLong("id"));
                    row.setNotes("");
                    return row;
                },
                customerId
        );
        timeline.addAll(bills);
        data.setCount(bills.size());
        timeline.addAll(dueRows(
                "SELECT a.amount, a.cash_paid, a.bank_paid, a.balance, a.date, a.time, b.user_name, " +
                        "COALESCE(a.txn_type, 'COLLECTION') AS txn_type, COALESCE(a.notes, '') AS notes " +
                        "FROM prod_bill_due a JOIN users b ON b.id = a.uid " +
                        "WHERE a.customer_id = ? ORDER BY a.date DESC, a.time DESC, a.id DESC",
                customerId
        ));
        sortTimeline(timeline);
        data.setTimeline(timeline);
        return data;
    }

    public CreditAccountData supplierAccount(Long supplierId) {
        List<Map<String, Object>> info = jdbcTemplate.queryForList(
                "SELECT name, CASE WHEN phone_number = '' OR phone_number IS NULL THEN '-' ELSE phone_number END AS phone_number " +
                        "FROM prod_supplier WHERE id = ?",
                supplierId
        );
        if (info.isEmpty()) {
            throw new RuntimeException("Supplier not found");
        }
        CreditAccountData data = new CreditAccountData();
        data.setId(supplierId);
        data.setName(String.valueOf(info.get(0).get("name")));
        data.setPhone(String.valueOf(info.get(0).get("phone_number")));

        List<Map<String, Object>> acc = jdbcTemplate.queryForList(
                "SELECT advance, balance FROM supplier_account WHERE supplier_id = ?",
                supplierId
        );
        data.setAdvance(acc.isEmpty() ? 0d : toDouble(acc.get(0).get("advance")));
        data.setBalance(acc.isEmpty() ? 0d : toDouble(acc.get(0).get("balance")));

        List<TimelineRow> timeline = new ArrayList<>();
        List<TimelineRow> purchases = jdbcTemplate.query(
                "SELECT COALESCE(pp.invno,'') AS invno, pp.net, pp.paid, pp.balance, pp.ent_date, pp.ent_time, " +
                        "u.user_name, pp.prno, pp.id " +
                        "FROM prod_purchase pp JOIN users u ON u.id = pp.ent_uid " +
                        "WHERE pp.deal_id = ? AND pp.is_cancelled = 0 AND pp.is_po = 0 ORDER BY pp.id DESC",
                (rs, i) -> {
                    String inv = nz(rs.getString("invno"));
                    String prno = nz(rs.getString("prno"));
                    TimelineRow row = new TimelineRow();
                    row.setType("PURCHASE");
                    row.setDocNo((inv.isEmpty() ? "" : inv + "/") + prno);
                    row.setAmount(rs.getDouble("net"));
                    row.setPaid(rs.getDouble("paid"));
                    row.setPending(rs.getDouble("balance"));
                    row.setDate(asDate(rs.getDate("ent_date")));
                    row.setTime(asTime(rs.getTime("ent_time")));
                    row.setUserName(nz(rs.getString("user_name")));
                    row.setRefId(rs.getLong("id"));
                    row.setNotes("");
                    return row;
                },
                supplierId
        );
        timeline.addAll(purchases);
        data.setCount(purchases.size());
        timeline.addAll(jdbcTemplate.query(
                "SELECT pr.return_no, pp.prno, pr.total, COALESCE(pr.notes,'') AS notes, " +
                        "DATE(pr.date_time) AS ret_date, TIME(pr.date_time) AS ret_time, COALESCE(u.user_name,'—') AS user_name " +
                        "FROM prod_purchase_return pr " +
                        "JOIN prod_purchase pp ON pr.purchase_id = pp.id " +
                        "LEFT JOIN users u ON u.id = pr.uid " +
                        "WHERE pr.supplier_id = ? ORDER BY pr.date_time DESC, pr.id DESC",
                (rs, i) -> {
                    TimelineRow row = new TimelineRow();
                    row.setType("RETURN");
                    row.setDocNo(nz(rs.getString("return_no")) + " / " + nz(rs.getString("prno")));
                    row.setAmount(rs.getDouble("total"));
                    row.setPaid(null);
                    row.setPending(null);
                    row.setDate(asDate(rs.getDate("ret_date")));
                    row.setTime(asTime(rs.getTime("ret_time")));
                    row.setUserName(nz(rs.getString("user_name")));
                    row.setRefId(-1L);
                    row.setNotes(nz(rs.getString("notes")));
                    return row;
                },
                supplierId
        ));
        timeline.addAll(dueRows(
                "SELECT a.amount, a.cash_paid, a.bank_paid, a.balance, a.date, a.time, b.user_name, " +
                        "COALESCE(a.txn_type, 'COLLECTION') AS txn_type, COALESCE(a.notes, '') AS notes " +
                        "FROM prod_supplier_due a JOIN users b ON b.id = a.uid " +
                        "WHERE a.supplier_id = ? ORDER BY a.date DESC, a.time DESC, a.id DESC",
                supplierId
        ));
        sortTimeline(timeline);
        data.setTimeline(timeline);
        return data;
    }

    @Transactional
    public AccountEntryResult saveCustomerEntry(Long customerId, AccountEntryRequest request, Long uid) {
        String type = entryType(request);
        if ("OLD_DUE".equals(type)) {
            return oldDue(
                    customerId, 0L, request, uid,
                    "SELECT balance FROM customer_account WHERE customer_id = ? FOR UPDATE",
                    "INSERT INTO prod_bill_due (customer_id, amount, cash_paid, bank_paid, balance, pay_mode, pay_type, txn_type, notes, uid, date, time) " +
                            "VALUES (?, ?, 0, 0, ?, 0, 0, 'OLD_DUE', ?, ?, CURRENT_DATE(), CURRENT_TIME())",
                    "UPDATE customer_account SET balance = ? WHERE customer_id = ?",
                    4
            );
        }
        if ("ADVANCE".equals(type)) {
            return advance(
                    customerId, 0L, request, uid,
                    "SELECT advance, balance FROM customer_account WHERE customer_id = ? FOR UPDATE",
                    "INSERT INTO prod_bill_due (customer_id, amount, cash_paid, bank_paid, balance, pay_mode, pay_type, txn_type, notes, uid, date, time) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, 'ADVANCE', ?, ?, CURRENT_DATE(), CURRENT_TIME())",
                    "UPDATE customer_account SET advance = ? WHERE customer_id = ?",
                    3, "Customer advance"
            );
        }
        if ("COLLECTION".equals(type)) {
            return collection(
                    customerId, 0L, request, uid,
                    "SELECT balance FROM customer_account WHERE customer_id = ? FOR UPDATE",
                    "INSERT INTO prod_bill_due (customer_id, amount, cash_paid, bank_paid, balance, pay_mode, pay_type, txn_type, notes, uid, date, time) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, 'COLLECTION', NULL, ?, CURRENT_DATE(), CURRENT_TIME())",
                    "UPDATE customer_account SET balance = ? WHERE customer_id = ?",
                    2, "No account balance due to collect."
            );
        }
        throw new RuntimeException("Invalid entry type.");
    }

    @Transactional
    public AccountEntryResult saveSupplierEntry(Long supplierId, AccountEntryRequest request, Long uid) {
        String type = entryType(request);
        if ("OLD_DUE".equals(type)) {
            return oldDue(
                    0L, supplierId, request, uid,
                    "SELECT balance FROM supplier_account WHERE supplier_id = ? FOR UPDATE",
                    "INSERT INTO prod_supplier_due (supplier_id, amount, cash_paid, bank_paid, balance, pay_mode, pay_type, txn_type, notes, uid, date, time) " +
                            "VALUES (?, ?, 0, 0, ?, 0, 0, 'OLD_DUE', ?, ?, CURRENT_DATE(), CURRENT_TIME())",
                    "UPDATE supplier_account SET balance = ? WHERE supplier_id = ?",
                    12
            );
        }
        if ("ADVANCE".equals(type)) {
            return advance(
                    0L, supplierId, request, uid,
                    "SELECT advance, balance FROM supplier_account WHERE supplier_id = ? FOR UPDATE",
                    "INSERT INTO prod_supplier_due (supplier_id, amount, cash_paid, bank_paid, balance, pay_mode, pay_type, txn_type, notes, uid, date, time) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, 'ADVANCE', ?, ?, CURRENT_DATE(), CURRENT_TIME())",
                    "UPDATE supplier_account SET advance = ? WHERE supplier_id = ?",
                    7, "Supplier advance"
            );
        }
        if ("COLLECTION".equals(type)) {
            return collection(
                    0L, supplierId, request, uid,
                    "SELECT balance FROM supplier_account WHERE supplier_id = ? FOR UPDATE",
                    "INSERT INTO prod_supplier_due (supplier_id, amount, cash_paid, bank_paid, balance, pay_mode, pay_type, txn_type, notes, uid, date, time) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, 'COLLECTION', NULL, ?, CURRENT_DATE(), CURRENT_TIME())",
                    "UPDATE supplier_account SET balance = ? WHERE supplier_id = ?",
                    6, "No account balance due to pay."
            );
        }
        throw new RuntimeException("Invalid entry type.");
    }

    private AccountEntryResult oldDue(Long customerId, Long supplierId, AccountEntryRequest request, Long uid,
                                      String lockSql, String insertSql, String updateSql, int ledgerType) {
        long partyId = customerId > 0 ? customerId : supplierId;
        Double current = lockBalance(lockSql, partyId);
        double dueAmount = nz(request.getAmount());
        if (dueAmount <= 0) {
            throw new RuntimeException("Old due amount must be greater than zero.");
        }
        double newBalance = current + dueAmount;
        String notes = noteOr(request.getNotes(), "Old due (before system)");
        long dueId = insertDue(insertSql, ps -> {
            ps.setLong(1, partyId);
            ps.setDouble(2, dueAmount);
            ps.setDouble(3, newBalance);
            ps.setString(4, notes);
            ps.setLong(5, uid);
        });
        insertLedger(ledgerType, dueId, customerId, supplierId, 0, dueAmount, 0, 0, 0, uid);
        jdbcTemplate.update(updateSql, newBalance, partyId);
        return result("OLD_DUE", newBalance, null);
    }

    private AccountEntryResult advance(Long customerId, Long supplierId, AccountEntryRequest request, Long uid,
                                       String lockSql, String insertSql, String updateSql, int ledgerType, String defaultNote) {
        long partyId = customerId > 0 ? customerId : supplierId;
        Map<String, Object> acc = lockAdvance(lockSql, partyId);
        double cash = nz(request.getCashPaid());
        double bank = nz(request.getBankPaid());
        double amount = cash + bank;
        if (amount <= 0) {
            throw new RuntimeException("Advance amount must be greater than zero.");
        }
        int payMode = nzInt(request.getPayMode(), 1);
        int payType = nzInt(request.getPayType(), 0);
        double currentAdvance = toDouble(acc.get("advance"));
        double currentBalance = toDouble(acc.get("balance"));
        double newAdvance = currentAdvance + amount;
        String notes = noteOr(request.getNotes(), defaultNote);
        long dueId = insertDue(insertSql, ps -> {
            ps.setLong(1, partyId);
            ps.setDouble(2, amount);
            ps.setDouble(3, cash);
            ps.setDouble(4, bank);
            ps.setDouble(5, currentBalance);
            ps.setInt(6, payMode);
            ps.setInt(7, payType);
            ps.setString(8, notes);
            ps.setLong(9, uid);
        });
        insertLedger(ledgerType, dueId, customerId, supplierId, payMode, amount, cash, bank, payType, uid);
        jdbcTemplate.update(updateSql, newAdvance, partyId);
        return result("ADVANCE", currentBalance, newAdvance);
    }

    private AccountEntryResult collection(Long customerId, Long supplierId, AccountEntryRequest request, Long uid,
                                          String lockSql, String insertSql, String updateSql, int ledgerType, String emptyMsg) {
        long partyId = customerId > 0 ? customerId : supplierId;
        double currentBalance = lockBalance(lockSql, partyId);
        if (currentBalance <= 0) {
            throw new RuntimeException(emptyMsg);
        }
        double cash = nz(request.getCashPaid());
        double bank = nz(request.getBankPaid());
        double amount = cash + bank;
        if (amount <= 0) {
            throw new RuntimeException("Payment amount must be greater than zero.");
        }
        double newBalance = Math.max(0, currentBalance - amount);
        int payMode = nzInt(request.getPayMode(), 1);
        int payType = nzInt(request.getPayType(), 0);
        long dueId = insertDue(insertSql, ps -> {
            ps.setLong(1, partyId);
            ps.setDouble(2, amount);
            ps.setDouble(3, cash);
            ps.setDouble(4, bank);
            ps.setDouble(5, newBalance);
            ps.setInt(6, payMode);
            ps.setInt(7, payType);
            ps.setLong(8, uid);
        });
        insertLedger(ledgerType, dueId, customerId, supplierId, payMode, amount, cash, bank, payType, uid);
        jdbcTemplate.update(updateSql, newBalance, partyId);
        return result("COLLECTION", newBalance, null);
    }

    private Double lockBalance(String sql, Long partyId) {
        List<Double> rows = jdbcTemplate.query(sql, (rs, i) -> rs.getDouble(1), partyId);
        if (rows.isEmpty()) {
            throw new RuntimeException("Account not found");
        }
        return rows.get(0);
    }

    private Map<String, Object> lockAdvance(String sql, Long partyId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, partyId);
        if (rows.isEmpty()) {
            throw new RuntimeException("Account not found");
        }
        return rows.get(0);
    }

    private long insertDue(String sql, SqlBinder binder) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            binder.bind(ps);
            return ps;
        }, keys);
        Number key = keys.getKey();
        if (key == null) {
            throw new RuntimeException("Failed to create account entry");
        }
        return key.longValue();
    }

    private void insertLedger(int billType, long billId, Long customerId, Long supplierId,
                              int payMode, double amount, double cash, double bank, int payType, Long uid) {
        jdbcTemplate.update(
                "INSERT INTO prod_ledger (bill_type, bill_id, customer_id, supplier_id, payment_mode, bill_amount, cash_paid, bank_paid, payment_type, uid, date_time) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                billType, billId,
                customerId != null && customerId > 0 ? customerId : null,
                supplierId != null && supplierId > 0 ? supplierId : null,
                payMode, amount, cash, bank, payType, uid
        );
    }

    private AccountTotalsData queryTotals(String table) {
        return jdbcTemplate.query(
                "SELECT COUNT(CASE WHEN balance > 0 THEN 1 END) AS due_count, " +
                        "COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0) AS total_due, " +
                        "COALESCE(SUM(advance), 0) AS total_advance FROM " + table,
                rs -> {
                    AccountTotalsData totals = new AccountTotalsData();
                    if (rs.next()) {
                        totals.setDueCount(rs.getLong("due_count"));
                        totals.setTotalDue(rs.getDouble("total_due"));
                        totals.setTotalAdvance(rs.getDouble("total_advance"));
                    } else {
                        totals.setDueCount(0L);
                        totals.setTotalDue(0d);
                        totals.setTotalAdvance(0d);
                    }
                    return totals;
                }
        );
    }

    private DuePartyData mapDueParty(java.sql.ResultSet rs, int i) throws java.sql.SQLException {
        DuePartyData row = new DuePartyData();
        row.setId(rs.getLong(1));
        row.setName(rs.getString(2));
        row.setPhone(rs.getString(3) == null || rs.getString(3).isBlank() ? "-" : rs.getString(3));
        row.setBalance(rs.getDouble(4));
        return row;
    }

    private List<TimelineRow> dueRows(String sql, Long partyId) {
        return jdbcTemplate.query(sql, (rs, i) -> {
            String txnType = nz(rs.getString("txn_type")).trim().toUpperCase();
            if (txnType.isEmpty()) {
                txnType = "COLLECTION";
            }
            double amount = rs.getDouble("amount");
            double cash = rs.getDouble("cash_paid");
            double bank = rs.getDouble("bank_paid");
            double balance = rs.getDouble("balance");
            TimelineRow row = new TimelineRow();
            row.setType(txnType);
            row.setDocNo("");
            row.setNotes(nz(rs.getString("notes")));
            if ("OLD_DUE".equals(txnType)) {
                row.setAmount(amount);
                row.setPaid(null);
                row.setPending(balance);
            } else if ("ADVANCE".equals(txnType)) {
                row.setAmount(amount);
                row.setPaid(cash + bank);
                row.setPending(balance);
            } else {
                row.setAmount(amount);
                row.setPaid(cash + bank);
                row.setPending(balance);
            }
            row.setDate(asDate(rs.getDate("date")));
            row.setTime(asTime(rs.getTime("time")));
            row.setUserName(nz(rs.getString("user_name")));
            row.setRefId(-1L);
            return row;
        }, partyId);
    }

    private void sortTimeline(List<TimelineRow> timeline) {
        timeline.sort(Comparator
                .comparing((TimelineRow r) -> nz(r.getDate()) + " " + nz(r.getTime()))
                .reversed());
    }

    private AccountEntryResult result(String type, Double balance, Double advance) {
        AccountEntryResult result = new AccountEntryResult();
        result.setEntryType(type);
        result.setNewBalance(balance);
        result.setNewAdvance(advance);
        return result;
    }

    private String entryType(AccountEntryRequest request) {
        if (request == null || request.getEntryType() == null) {
            throw new RuntimeException("Missing required parameters.");
        }
        return request.getEntryType().trim().toUpperCase();
    }

    private String noteOr(String notes, String fallback) {
        return notes != null && !notes.trim().isEmpty() ? notes.trim() : fallback;
    }

    private String asDate(Date date) {
        return date == null ? "" : date.toString();
    }

    private String asTime(Time time) {
        return time == null ? "" : time.toString();
    }

    private String nz(String value) {
        return value == null ? "" : value;
    }

    private double nz(Double value) {
        return value == null ? 0 : value;
    }

    private int nzInt(Integer value, int fallback) {
        return value == null ? fallback : value;
    }

    private double toDouble(Object value) {
        if (value == null) {
            return 0;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    @FunctionalInterface
    private interface SqlBinder {
        void bind(PreparedStatement ps) throws java.sql.SQLException;
    }
}
