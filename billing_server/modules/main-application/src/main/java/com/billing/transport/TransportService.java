package com.billing.transport;

import com.billing.pos.BillingReadService;
import com.billing.pos.dto.CustomerData;
import com.billing.transport.dto.CollectTransportRequest;
import com.billing.transport.dto.CollectTransportResult;
import com.billing.transport.dto.SaveTransportBillRequest;
import com.billing.transport.dto.SaveTransportBillResponse;
import com.billing.transport.dto.TransportBillData;
import com.billing.transport.dto.TransportDashboardData;
import com.billing.transport.dto.TransportDashboardDay;
import com.billing.transport.dto.TransportPaymentRow;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TransportService {

    private final JdbcTemplate jdbcTemplate;
    private final BillingReadService billingReadService;

    public List<CustomerData> searchTransports(String query, String phone) {
        return billingReadService.searchCustomers(query, phone);
    }

    public List<TransportBillData> bills() {
        return jdbcTemplate.query(
                billSql("tb.is_cancelled = 0") + " ORDER BY tb.id DESC LIMIT 200",
                this::mapBill
        );
    }

    public List<TransportBillData> pendingAllotments() {
        return jdbcTemplate.query(
                billSql("tb.is_cancelled = 0 AND tb.is_allotted = 0") + " ORDER BY tb.id DESC",
                this::mapBill
        );
    }

    public List<TransportBillData> pendingPayments() {
        return jdbcTemplate.query(
                billSql("tb.is_cancelled = 0 AND tb.current_balance > 0.005") + " ORDER BY tb.current_balance DESC, tb.id DESC",
                this::mapBill
        );
    }

    public List<TransportBillData> allottedBills() {
        return jdbcTemplate.query(
                billSql("tb.is_cancelled = 0 AND tb.is_allotted = 1") + " ORDER BY tb.id DESC",
                this::mapBill
        );
    }

    public List<TransportBillData> pendingVehiclePayments() {
        return jdbcTemplate.query(
                billSql("tb.is_cancelled = 0 AND tb.is_allotted = 1 AND tb.veh_balance > 0.005") +
                        " ORDER BY tb.veh_balance DESC, tb.id DESC",
                this::mapBill
        );
    }

    public List<TransportPaymentRow> paymentHistory(Long id, String kind) {
        requireBill(id);
        boolean vehicle = kind != null && kind.equalsIgnoreCase("vehicle");
        String types = vehicle ? "'VEHICLE'" : "'BILL','COLLECTION'";
        return jdbcTemplate.query(
                "SELECT txn_type, `date`, `time`, utr_no, amount, cash_paid, bank_paid, balance, pay_mode " +
                        "FROM trans_bill_due WHERE bill_id = ? AND txn_type IN (" + types + ") ORDER BY id ASC",
                this::mapPayment,
                id
        );
    }

    public TransportDashboardData dashboard(Integer year, Integer month) {
        LocalDate now = LocalDate.now();
        int y = year == null ? now.getYear() : year;
        int m = month == null ? now.getMonthValue() : month;
        if (m < 1) {
            m = 1;
        }
        if (m > 12) {
            m = 12;
        }
        YearMonth ym = YearMonth.of(y, m);
        String start = ym.atDay(1).toString();
        String end = ym.atEndOfMonth().toString();
        YearMonth prev = ym.minusMonths(1);
        String prevStart = prev.atDay(1).toString();
        String prevEnd = prev.atEndOfMonth().toString();

        TransportDashboardData data = monthTotals(start, end);
        TransportDashboardData last = monthTotals(prevStart, prevEnd);
        data.setYear(y);
        data.setMonth(m);
        String monthName = ym.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
        data.setLabel(monthName + " " + y);
        data.setLastAgentFreight(last.getAgentFreight());
        data.setAgentPct(pct(data.getAgentFreight(), last.getAgentFreight()));
        data.setLastVehFreight(last.getVehFreight());
        data.setVehPct(pct(data.getVehFreight(), last.getVehFreight()));
        data.setLastMargin(last.getMargin());
        data.setMarginPct(pct(data.getMargin(), last.getMargin()));
        data.setInTransit(Math.max(0, nzInt(data.getAllotted()) - nzInt(data.getUnloaded())));

        jdbcTemplate.query(
                "SELECT COUNT(*) AS bills, COALESCE(SUM(freight_amount),0) AS freight FROM trans_bill " +
                        "WHERE is_cancelled = 0 AND `date` = CURDATE()",
                rs -> {
                    if (rs.next()) {
                        data.setTodayBills(rs.getInt("bills"));
                        data.setTodayFreight(rs.getDouble("freight"));
                    }
                    return null;
                }
        );

        Map<String, TransportDashboardDay> byDay = new HashMap<>();
        jdbcTemplate.query(
                "SELECT `date` AS d, COALESCE(SUM(freight_amount),0) AS freight, " +
                        "COALESCE(SUM(CASE WHEN is_allotted = 1 THEN veh_freight ELSE 0 END),0) AS veh " +
                        "FROM trans_bill WHERE is_cancelled = 0 AND `date` BETWEEN ? AND ? GROUP BY `date`",
                (rs, i) -> {
                    TransportDashboardDay row = new TransportDashboardDay();
                    Date d = rs.getDate("d");
                    row.setDate(d == null ? "" : String.valueOf(d));
                    row.setFreight(rs.getDouble("freight"));
                    row.setVehFreight(rs.getDouble("veh"));
                    byDay.put(row.getDate(), row);
                    return null;
                },
                start, end
        );
        DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("dd MMM");
        List<TransportDashboardDay> daily = new ArrayList<>();
        for (LocalDate day = ym.atDay(1); !day.isAfter(ym.atEndOfMonth()); day = day.plusDays(1)) {
            TransportDashboardDay found = byDay.get(day.toString());
            TransportDashboardDay row = new TransportDashboardDay();
            row.setDate(day.format(dayFmt));
            row.setFreight(found == null ? 0d : found.getFreight());
            row.setVehFreight(found == null ? 0d : found.getVehFreight());
            daily.add(row);
        }
        data.setDaily(daily);
        return data;
    }

    private TransportDashboardData monthTotals(String start, String end) {
        return jdbcTemplate.query(
                "SELECT COUNT(*) AS bills, " +
                        "COALESCE(SUM(freight_amount),0) AS agent_freight, " +
                        "COALESCE(SUM(paid),0) AS agent_paid, " +
                        "COALESCE(SUM(current_balance),0) AS agent_due, " +
                        "COALESCE(SUM(CASE WHEN is_allotted = 1 THEN veh_freight ELSE 0 END),0) AS veh_freight, " +
                        "COALESCE(SUM(CASE WHEN is_allotted = 1 THEN veh_paid ELSE 0 END),0) AS veh_paid, " +
                        "COALESCE(SUM(CASE WHEN is_allotted = 1 THEN veh_balance ELSE 0 END),0) AS veh_due, " +
                        "COALESCE(SUM(CASE WHEN is_allotted = 1 THEN freight_amount - veh_freight ELSE 0 END),0) AS margin, " +
                        "SUM(CASE WHEN is_allotted = 0 THEN 1 ELSE 0 END) AS pending_allot, " +
                        "SUM(CASE WHEN is_allotted = 1 THEN 1 ELSE 0 END) AS allotted, " +
                        "SUM(CASE WHEN COALESCE(is_unloaded,0) = 1 THEN 1 ELSE 0 END) AS unloaded " +
                        "FROM trans_bill WHERE is_cancelled = 0 AND `date` BETWEEN ? AND ?",
                rs -> {
                    TransportDashboardData row = new TransportDashboardData();
                    if (rs.next()) {
                        row.setBills(rs.getInt("bills"));
                        row.setAgentFreight(rs.getDouble("agent_freight"));
                        row.setAgentPaid(rs.getDouble("agent_paid"));
                        row.setAgentDue(rs.getDouble("agent_due"));
                        row.setVehFreight(rs.getDouble("veh_freight"));
                        row.setVehPaid(rs.getDouble("veh_paid"));
                        row.setVehDue(rs.getDouble("veh_due"));
                        row.setMargin(rs.getDouble("margin"));
                        row.setPendingAllotments(rs.getInt("pending_allot"));
                        row.setAllotted(rs.getInt("allotted"));
                        row.setUnloaded(rs.getInt("unloaded"));
                    }
                    return row;
                },
                start, end
        );
    }

    private double pct(Double curr, Double last) {
        double c = curr == null ? 0 : curr;
        double l = last == null ? 0 : last;
        if (Math.abs(l) < 0.005) {
            return 0;
        }
        return ((c - l) / l) * 100;
    }

    private int nzInt(Integer value) {
        return value == null ? 0 : value;
    }

    @Transactional
    public SaveTransportBillResponse save(SaveTransportBillRequest request, Long uid) {
        String name = request.getCustomerName() == null ? "" : request.getCustomerName().trim();
        if (name.isEmpty() || "-".equals(name)) {
            throw new RuntimeException("Transport name is required.");
        }
        String loadFrom = requiredText(request.getLoadFrom(), "Load from is required.");
        String loadTo = requiredText(request.getLoadTo(), "Load to is required.");
        double freight = nz(request.getFreightAmount());
        if (freight <= 0) {
            throw new RuntimeException("Freight amount must be greater than zero.");
        }
        double cashPaid = nz(request.getCashPaid());
        double bankPaid = nz(request.getBankPaid());
        double balance = nz(request.getBalance());
        if (cashPaid + bankPaid > freight + 0.001) {
            throw new RuntimeException("Paid amount exceeds freight amount.");
        }
        if (Math.abs(cashPaid + bankPaid + balance - freight) > 0.02) {
            throw new RuntimeException("Paid and freight amount mismatch.");
        }
        int mode = request.getMode() == null ? 1 : request.getMode();
        int type = mode == 1 ? 0 : (request.getType() == null ? 1 : request.getType());
        Date payDate = parseDate(request.getPayDate());
        String utrNo = blankToEmpty(request.getUtrNo());
        requirePayMeta(cashPaid + bankPaid, bankPaid, payDate, utrNo);
        Long customerId = resolveCustomer(request);
        String phone = blankToDash(request.getCustomerPhn());
        String trNo = nextTrNo();

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO trans_bill (tr_no, customer_id, cus_name, cus_phn, load_from, load_to, freight_amount, " +
                            "paid, cash_paid, bank_paid, balance, current_balance, is_balance, payment_mode, payment_type, " +
                            "is_allotted, uid, `date`, `time`, pay_date, utr_no) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), NOW(), ?, ?)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, trNo);
            if (customerId != null && customerId > 0) {
                ps.setLong(2, customerId);
            } else {
                ps.setNull(2, java.sql.Types.INTEGER);
            }
            ps.setString(3, name);
            ps.setString(4, phone);
            ps.setString(5, loadFrom);
            ps.setString(6, loadTo);
            ps.setDouble(7, freight);
            ps.setDouble(8, cashPaid + bankPaid);
            ps.setDouble(9, cashPaid);
            ps.setDouble(10, bankPaid);
            ps.setDouble(11, balance);
            ps.setDouble(12, balance);
            ps.setInt(13, balance > 0.005 ? 1 : 0);
            ps.setInt(14, mode);
            ps.setInt(15, type);
            ps.setLong(16, uid);
            if (payDate != null) {
                ps.setDate(17, payDate);
            } else {
                ps.setNull(17, java.sql.Types.DATE);
            }
            ps.setString(18, utrNo);
            return ps;
        }, keyHolder);
        long billId = requireGeneratedId(keyHolder);
        if (cashPaid + bankPaid > 0.005) {
            insertDue(billId, customerId, cashPaid, bankPaid, balance, mode, type, "BILL", "Booking payment", uid, payDate, utrNo);
        }
        return new SaveTransportBillResponse(trNo, billId);
    }

    @Transactional
    public CollectTransportResult allot(Long id, CollectTransportRequest request, Long uid) {
        TransportBillData bill = requireBill(id);
        if (bill.getIsAllotted() != null && bill.getIsAllotted() == 1) {
            throw new RuntimeException("This load is already allotted.");
        }
        String vehicleNo = requiredText(request.getVehicleNo(), "Vehicle number is required.");
        String driverNo = requiredText(request.getDriverNo(), "Driver number is required.");
        String ownerNo = requiredText(request.getOwnerNo(), "Vehicle owner number is required.");
        double vehFreight = nz(request.getVehFreight());
        if (vehFreight <= 0) {
            throw new RuntimeException("Vehicle freight must be greater than zero.");
        }
        double cashPaid = nz(request.getCashPaid());
        double bankPaid = nz(request.getBankPaid());
        double vehPaid = cashPaid + bankPaid;
        double vehBalance = request.getBalance() == null ? Math.max(0, vehFreight - vehPaid) : nz(request.getBalance());
        if (vehPaid > vehFreight + 0.001) {
            throw new RuntimeException("Paid to vehicle exceeds vehicle freight.");
        }
        if (Math.abs(vehPaid + vehBalance - vehFreight) > 0.02) {
            throw new RuntimeException("Vehicle paid and freight amount mismatch.");
        }
        Date payDate = parseDate(request.getPayDate());
        String utrNo = blankToEmpty(request.getUtrNo());
        requirePayMeta(vehPaid, bankPaid, payDate, utrNo);
        int mode = request.getMode() == null ? 1 : request.getMode();
        int type = mode == 1 ? 0 : (request.getType() == null ? 1 : request.getType());
        jdbcTemplate.update(
                "UPDATE trans_bill SET vehicle_no = ?, driver_no = ?, owner_no = ?, " +
                        "veh_freight = ?, veh_paid = ?, veh_cash_paid = ?, veh_bank_paid = ?, veh_balance = ?, " +
                        "veh_payment_mode = ?, veh_payment_type = ?, veh_pay_date = ?, veh_utr_no = ?, " +
                        "is_allotted = 1, allotted_uid = ?, allotted_at = NOW() WHERE id = ?",
                vehicleNo, driverNo, ownerNo,
                vehFreight, vehPaid, cashPaid, bankPaid, vehBalance,
                mode, type, payDate, utrNo,
                uid, id
        );
        if (vehPaid > 0.005) {
            insertDue(id, bill.getCustomerId(), cashPaid, bankPaid, vehBalance, mode, type, "VEHICLE", "Paid to vehicle", uid, payDate, utrNo);
        }
        TransportBillData updated = requireBill(id);
        return new CollectTransportResult(updated.getTrNo(), updated.getPaid(), updated.getCurrentBalance(), 1);
    }

    @Transactional
    public CollectTransportResult collect(Long id, CollectTransportRequest request, Long uid) {
        TransportBillData bill = requireBill(id);
        if (bill.getCurrentBalance() == null || bill.getCurrentBalance() <= 0.005) {
            throw new RuntimeException("No balance due on this transport bill.");
        }
        applyCollection(bill, request, uid, "COLLECTION", "Balance collection");
        TransportBillData updated = requireBill(id);
        return new CollectTransportResult(
                updated.getTrNo(),
                updated.getPaid(),
                updated.getCurrentBalance(),
                updated.getIsAllotted()
        );
    }

    @Transactional
    public CollectTransportResult payVehicle(Long id, CollectTransportRequest request, Long uid) {
        TransportBillData bill = requireBill(id);
        if (bill.getIsAllotted() == null || bill.getIsAllotted() != 1) {
            throw new RuntimeException("Allot the vehicle first.");
        }
        if (bill.getVehBalance() == null || bill.getVehBalance() <= 0.005) {
            throw new RuntimeException("No vehicle balance to pay.");
        }
        double cashPaid = nz(request == null ? null : request.getCashPaid());
        double bankPaid = nz(request == null ? null : request.getBankPaid());
        double amount = cashPaid + bankPaid;
        double due = nz(bill.getVehBalance());
        if (amount <= 0.005) {
            throw new RuntimeException("Enter an amount to pay the vehicle.");
        }
        if (amount > due + 0.02) {
            throw new RuntimeException("Payment exceeds vehicle balance.");
        }
        Date payDate = parseDate(request == null ? null : request.getPayDate());
        String utrNo = blankToEmpty(request == null ? null : request.getUtrNo());
        requirePayMeta(amount, bankPaid, payDate, utrNo);
        int mode = request == null || request.getMode() == null ? (bankPaid > 0 && cashPaid > 0 ? 3 : bankPaid > 0 ? 2 : 1) : request.getMode();
        int type = mode == 1 ? 0 : (request == null || request.getType() == null ? 1 : request.getType());
        double newBalance = Math.max(0, due - amount);
        jdbcTemplate.update(
                "UPDATE trans_bill SET veh_paid = veh_paid + ?, veh_cash_paid = veh_cash_paid + ?, veh_bank_paid = veh_bank_paid + ?, " +
                        "veh_balance = ?, veh_payment_mode = ?, veh_payment_type = ?, veh_pay_date = ?, veh_utr_no = ? WHERE id = ?",
                amount, cashPaid, bankPaid, newBalance, mode, type, payDate, utrNo, bill.getId()
        );
        insertDue(bill.getId(), bill.getCustomerId(), cashPaid, bankPaid, newBalance, mode, type, "VEHICLE", "Vehicle balance payment", uid, payDate, utrNo);
        TransportBillData updated = requireBill(id);
        return new CollectTransportResult(updated.getTrNo(), updated.getVehPaid(), updated.getVehBalance(), updated.getIsAllotted());
    }

    private void applyCollection(TransportBillData bill, CollectTransportRequest request, Long uid, String txnType, String notes) {
        double cashPaid = nz(request == null ? null : request.getCashPaid());
        double bankPaid = nz(request == null ? null : request.getBankPaid());
        double amount = cashPaid + bankPaid;
        double due = nz(bill.getCurrentBalance());
        if (amount <= 0.005) {
            throw new RuntimeException("Enter an amount to collect.");
        }
        if (amount > due + 0.02) {
            throw new RuntimeException("Collection exceeds current balance.");
        }
        Date payDate = parseDate(request == null ? null : request.getPayDate());
        String utrNo = blankToEmpty(request == null ? null : request.getUtrNo());
        requirePayMeta(amount, bankPaid, payDate, utrNo);
        int mode = request == null || request.getMode() == null ? (bankPaid > 0 && cashPaid > 0 ? 3 : bankPaid > 0 ? 2 : 1) : request.getMode();
        int type = mode == 1 ? 0 : (request == null || request.getType() == null ? 1 : request.getType());
        double newBalance = Math.max(0, due - amount);
        jdbcTemplate.update(
                "UPDATE trans_bill SET paid = paid + ?, cash_paid = cash_paid + ?, bank_paid = bank_paid + ?, " +
                        "current_balance = ?, is_balance = ? WHERE id = ?",
                amount, cashPaid, bankPaid, newBalance, newBalance > 0.005 ? 1 : 0, bill.getId()
        );
        insertDue(bill.getId(), bill.getCustomerId(), cashPaid, bankPaid, newBalance, mode, type, txnType, notes, uid, payDate, utrNo);
    }

    private void insertDue(Long billId, Long customerId, double cashPaid, double bankPaid, double balance,
                           int mode, int type, String txnType, String notes, Long uid, Date payDate, String utrNo) {
        jdbcTemplate.update(
                "INSERT INTO trans_bill_due (bill_id, customer_id, amount, cash_paid, bank_paid, balance, pay_mode, pay_type, txn_type, utr_no, notes, uid, `date`, `time`) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIME())",
                billId,
                customerId != null && customerId > 0 ? customerId : null,
                cashPaid + bankPaid, cashPaid, bankPaid, balance, mode, type, txnType, utrNo, notes, uid,
                payDate != null ? payDate : Date.valueOf(LocalDate.now())
        );
    }

    private void requirePayMeta(double paid, double bankPaid, Date payDate, String utrNo) {
        if (paid <= 0.005) {
            return;
        }
        if (payDate == null) {
            throw new RuntimeException("Payment date is required.");
        }
        if (bankPaid > 0.005 && (utrNo == null || utrNo.isBlank())) {
            throw new RuntimeException("UTR number is required for bank payment.");
        }
    }

    private Date parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Date.valueOf(value.trim());
        } catch (Exception ex) {
            throw new RuntimeException("Invalid payment date.");
        }
    }

    public TransportBillData requireBill(Long id) {
        List<TransportBillData> rows = jdbcTemplate.query(
                billSql("tb.id = ? AND tb.is_cancelled = 0"),
                this::mapBill,
                id
        );
        if (rows.isEmpty()) {
            throw new RuntimeException("Transport bill not found.");
        }
        return rows.get(0);
    }

    private Long resolveCustomer(SaveTransportBillRequest request) {
        Long customerId = request.getCustomerId() == null ? 0L : request.getCustomerId();
        String name = request.getCustomerName() == null ? "" : request.getCustomerName().trim();
        if (customerId > 0) {
            return customerId;
        }
        List<Long> existing = jdbcTemplate.query(
                "SELECT id FROM customers WHERE name = ? LIMIT 1",
                (rs, i) -> rs.getLong(1),
                name
        );
        if (!existing.isEmpty()) {
            return existing.get(0);
        }
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO customers(name, date, time, address, phone_number, gstin, is_gst, is_eligible_for_commission) VALUES (?, NOW(), NOW(), '', ?, '', 0, 0)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, name);
            ps.setString(2, request.getCustomerPhn() == null ? "" : request.getCustomerPhn().trim());
            return ps;
        }, keyHolder);
        long newId = requireGeneratedId(keyHolder);
        jdbcTemplate.update("INSERT INTO customer_account(customer_id, advance, balance) VALUES (?, 0.00, 0.00)", newId);
        return newId;
    }

    private String nextTrNo() {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(id) FROM trans_bill WHERE YEAR(`date`) = YEAR(CURDATE())",
                Integer.class
        );
        int year = Calendar.getInstance().get(Calendar.YEAR) % 100;
        return "T" + year + "-" + ((count == null ? 0 : count) + 1);
    }

    @Transactional
    public TransportBillData markUnloaded(Long id, boolean unloaded, Long uid) {
        TransportBillData bill = requireBill(id);
        if (bill.getIsAllotted() == null || bill.getIsAllotted() != 1) {
            throw new RuntimeException("Allot the vehicle first.");
        }
        if (unloaded) {
            jdbcTemplate.update(
                    "UPDATE trans_bill SET is_unloaded = 1, unloaded_at = NOW(), unloaded_uid = ? WHERE id = ?",
                    uid, id
            );
        } else {
            jdbcTemplate.update(
                    "UPDATE trans_bill SET is_unloaded = 0, unloaded_at = NULL, unloaded_uid = NULL WHERE id = ?",
                    id
            );
        }
        return requireBill(id);
    }

    @Transactional
    public TransportBillData attachBillImage(Long id, String filename) {
        TransportBillData bill = requireBill(id);
        if (bill.getIsAllotted() == null || bill.getIsAllotted() != 1) {
            throw new RuntimeException("Allot the vehicle first.");
        }
        String current = bill.getBillImage() == null ? "" : bill.getBillImage().trim();
        String next = current.isEmpty() ? filename : current + "," + filename;
        jdbcTemplate.update("UPDATE trans_bill SET bill_image = ? WHERE id = ?", next, id);
        return requireBill(id);
    }

    private String billSql(String where) {
        return "SELECT tb.id, tb.tr_no, tb.customer_id, tb.cus_name, tb.cus_phn, tb.load_from, tb.load_to, " +
                "tb.vehicle_no, tb.driver_no, tb.owner_no, tb.pay_date, tb.utr_no, " +
                "tb.freight_amount, tb.paid, tb.cash_paid, tb.bank_paid, tb.balance, tb.current_balance, " +
                "tb.veh_freight, tb.veh_paid, tb.veh_cash_paid, tb.veh_bank_paid, tb.veh_balance, " +
                "tb.veh_payment_mode, tb.veh_payment_type, tb.veh_pay_date, tb.veh_utr_no, " +
                "tb.payment_mode, tb.payment_type, tb.is_allotted, COALESCE(tb.is_unloaded, 0) AS is_unloaded, " +
                "tb.bill_image, tb.uid, COALESCE(u.user_name, '-') AS user_name, " +
                "tb.`date`, tb.`time` " +
                "FROM trans_bill tb LEFT JOIN users u ON u.id = tb.uid WHERE " + where;
    }

    private TransportPaymentRow mapPayment(ResultSet rs, int i) throws SQLException {
        TransportPaymentRow row = new TransportPaymentRow();
        row.setTxnType(rs.getString("txn_type"));
        row.setDate(rs.getDate("date") == null ? "" : String.valueOf(rs.getDate("date")));
        row.setTime(rs.getTime("time") == null ? "" : String.valueOf(rs.getTime("time")));
        row.setUtrNo(rs.getString("utr_no"));
        row.setAmount(rs.getDouble("amount"));
        row.setCashPaid(rs.getDouble("cash_paid"));
        row.setBankPaid(rs.getDouble("bank_paid"));
        row.setBalance(rs.getDouble("balance"));
        row.setPayMode(rs.getInt("pay_mode"));
        return row;
    }

    private TransportBillData mapBill(ResultSet rs, int i) throws SQLException {
        TransportBillData row = new TransportBillData();
        row.setId(rs.getLong("id"));
        row.setTrNo(rs.getString("tr_no"));
        long customerId = rs.getLong("customer_id");
        row.setCustomerId(rs.wasNull() ? 0L : customerId);
        row.setName(rs.getString("cus_name"));
        row.setPhone(rs.getString("cus_phn"));
        row.setLoadFrom(rs.getString("load_from"));
        row.setLoadTo(rs.getString("load_to"));
        row.setVehicleNo(rs.getString("vehicle_no"));
        row.setDriverNo(rs.getString("driver_no"));
        row.setOwnerNo(rs.getString("owner_no"));
        row.setPayDate(rs.getDate("pay_date") == null ? "" : String.valueOf(rs.getDate("pay_date")));
        row.setUtrNo(rs.getString("utr_no"));
        row.setFreightAmount(rs.getDouble("freight_amount"));
        row.setPaid(rs.getDouble("paid"));
        row.setCashPaid(rs.getDouble("cash_paid"));
        row.setBankPaid(rs.getDouble("bank_paid"));
        row.setBalance(rs.getDouble("balance"));
        row.setCurrentBalance(rs.getDouble("current_balance"));
        row.setVehFreight(rs.getDouble("veh_freight"));
        row.setVehPaid(rs.getDouble("veh_paid"));
        row.setVehCashPaid(rs.getDouble("veh_cash_paid"));
        row.setVehBankPaid(rs.getDouble("veh_bank_paid"));
        row.setVehBalance(rs.getDouble("veh_balance"));
        row.setVehPaymentMode(rs.getInt("veh_payment_mode"));
        row.setVehPaymentType(rs.getInt("veh_payment_type"));
        row.setVehPayDate(rs.getDate("veh_pay_date") == null ? "" : String.valueOf(rs.getDate("veh_pay_date")));
        row.setVehUtrNo(rs.getString("veh_utr_no"));
        row.setPaymentMode(rs.getInt("payment_mode"));
        row.setPaymentType(rs.getInt("payment_type"));
        row.setIsAllotted(rs.getInt("is_allotted"));
        row.setIsUnloaded(rs.getInt("is_unloaded"));
        row.setBillImage(rs.getString("bill_image"));
        row.setUid(rs.getLong("uid"));
        row.setUserName(rs.getString("user_name"));
        row.setDate(String.valueOf(rs.getDate("date")));
        row.setTime(String.valueOf(rs.getTime("time")));
        return row;
    }

    private long requireGeneratedId(KeyHolder keyHolder) {
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new RuntimeException("Failed to create record");
        }
        return key.longValue();
    }

    private String requiredText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new RuntimeException(message);
        }
        return value.trim();
    }

    private double nz(Double value) {
        return value == null ? 0 : value;
    }

    private String blankToDash(String value) {
        return value == null || value.isBlank() ? "-" : value.trim();
    }

    private String blankToEmpty(String value) {
        return value == null ? "" : value.trim();
    }
}
