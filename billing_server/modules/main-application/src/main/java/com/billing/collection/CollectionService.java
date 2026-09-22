package com.billing.collection;

import com.billing.collection.dto.AccountExpenseRow;
import com.billing.collection.dto.AccountReportData;
import com.billing.collection.dto.CollectionLookupData;
import com.billing.collection.dto.PendingCustomerRow;
import com.billing.collection.dto.CollectionMonthData;
import com.billing.collection.dto.CollectionPaymentRow;
import com.billing.collection.dto.CollectionReportData;
import com.billing.collection.dto.CollectionReportRow;
import com.billing.collection.dto.CollectionCancelRequest;
import com.billing.collection.dto.CollectionLogRow;
import com.billing.collection.dto.CollectionSaveRequest;
import com.billing.collection.dto.CollectionUpdateRequest;
import com.billing.collection.dto.DashboardCollector;
import com.billing.collection.dto.DashboardData;
import com.billing.collection.dto.DashboardDay;
import com.billing.customer.CableCustomerService;
import com.billing.customer.dto.CableCustomerRow;
import com.billing.customer.dto.PagedResult;
import com.billing.data.AppUser;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CollectionService {

    private static final Set<String> PAY_MODES = Set.of("cash", "upi");
    private static final DateTimeFormatter MONTH_LABEL = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter DAY_SHORT = DateTimeFormatter.ofPattern("dd MMM", Locale.ENGLISH);
    private static final DateTimeFormatter PAID_LABEL = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    private final JdbcTemplate jdbcTemplate;
    private final CableCustomerService cableCustomerService;

    @PostConstruct
    public void ensureTable() {
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS cable_collections (" +
                        "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
                        "customer_pk INT NOT NULL," +
                        "customer_id VARCHAR(50) NOT NULL," +
                        "collection_month DATE NOT NULL," +
                        "amount DECIMAL(12,2) NOT NULL," +
                        "due_amount DECIMAL(12,2) DEFAULT NULL," +
                        "pay_mode VARCHAR(10) NOT NULL," +
                        "paid_date DATE NOT NULL," +
                        "paid_time TIME NOT NULL," +
                        "uid INT DEFAULT NULL," +
                        "shop_id VARCHAR(255) DEFAULT NULL," +
                        "notes TEXT," +
                        "PRIMARY KEY (id)," +
                        "KEY idx_cable_collection_month (shop_id, customer_pk, collection_month)" +
                        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
        Integer uniqueExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.STATISTICS " +
                        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_collections' " +
                        "AND INDEX_NAME = 'uk_cable_collection_month'",
                Integer.class
        );
        if (uniqueExists != null && uniqueExists > 0) {
            jdbcTemplate.execute("ALTER TABLE cable_collections DROP INDEX uk_cable_collection_month");
        }
        ensureColumn("due_amount", "DECIMAL(12,2) DEFAULT NULL AFTER amount");
        ensureColumn("is_cancelled", "TINYINT NOT NULL DEFAULT 0 AFTER notes");
        ensureRechargeTable();
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS cable_collection_logs (" +
                        "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
                        "collection_id INT NOT NULL," +
                        "action VARCHAR(20) NOT NULL," +
                        "customer_id VARCHAR(50) DEFAULT NULL," +
                        "collection_month DATE DEFAULT NULL," +
                        "old_amount DECIMAL(12,2) DEFAULT NULL," +
                        "new_amount DECIMAL(12,2) DEFAULT NULL," +
                        "old_pay_mode VARCHAR(10) DEFAULT NULL," +
                        "new_pay_mode VARCHAR(10) DEFAULT NULL," +
                        "old_paid_date DATE DEFAULT NULL," +
                        "new_paid_date DATE DEFAULT NULL," +
                        "reason TEXT," +
                        "uid INT DEFAULT NULL," +
                        "shop_id VARCHAR(255) DEFAULT NULL," +
                        "log_date DATE DEFAULT NULL," +
                        "log_time TIME DEFAULT NULL," +
                        "PRIMARY KEY (id)," +
                        "KEY idx_cable_collection_log (shop_id, log_date)" +
                        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
    }

    private void ensureColumn(String column, String definition) {
        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS " +
                        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_collections' AND COLUMN_NAME = ?",
                Integer.class,
                column
        );
        if (exists == null || exists == 0) {
            jdbcTemplate.execute("ALTER TABLE cable_collections ADD COLUMN " + column + " " + definition);
        }
    }

    private void ensureRechargeTable() {
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS cable_recharges (" +
                        "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
                        "customer_pk INT NOT NULL," +
                        "customer_id VARCHAR(50) NOT NULL," +
                        "recharge_year INT NOT NULL," +
                        "recharge_month INT NOT NULL," +
                        "due_amount DECIMAL(12,2) NOT NULL DEFAULT 0," +
                        "paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0," +
                        "pending_amount DECIMAL(12,2) NOT NULL DEFAULT 0," +
                        "recharge_date DATE DEFAULT NULL," +
                        "recharge_time TIME DEFAULT NULL," +
                        "pay_mode VARCHAR(10) DEFAULT NULL," +
                        "paid_date DATE DEFAULT NULL," +
                        "paid_time TIME DEFAULT NULL," +
                        "uid INT DEFAULT NULL," +
                        "shop_id VARCHAR(255) DEFAULT NULL," +
                        "PRIMARY KEY (id)," +
                        "UNIQUE KEY uk_cable_recharge_month (shop_id, customer_pk, recharge_year, recharge_month)," +
                        "KEY idx_cable_recharge_pending (shop_id, pending_amount)" +
                        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
        ensureRechargeColumn("recharge_date", "DATE DEFAULT NULL AFTER pending_amount");
        ensureRechargeColumn("recharge_time", "TIME DEFAULT NULL AFTER recharge_date");
        jdbcTemplate.update(
                "UPDATE cable_recharges SET recharge_date = paid_date " +
                        "WHERE recharge_date IS NULL AND paid_date IS NOT NULL"
        );
    }

    private void ensureRechargeColumn(String column, String definition) {
        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS " +
                        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_recharges' AND COLUMN_NAME = ?",
                Integer.class,
                column
        );
        if (exists == null || exists == 0) {
            jdbcTemplate.execute("ALTER TABLE cable_recharges ADD COLUMN " + column + " " + definition);
        }
    }

    public CollectionLookupData lookup(String customerId, AppUser user) {
        CableCustomerRow customer = cableCustomerService.findActiveByCustomerId(user, customerId);
        CollectionLookupData data = new CollectionLookupData();
        data.setCustomer(customer);
        double due = nz(customer.getMonthlyAmount());
        data.setLastAmount(due > 0 ? due : lastAmount(customer.getId(), user.shopId()));
        YearMonth current = YearMonth.now();
        Map<YearMonth, RechargeRow> recharges = rechargesForCustomer(customer.getId(), user.shopId());
        RechargeRow currentRecharge = hasRecharge(customer.getId(), user.shopId(), current)
                ? recharges.get(current)
                : null;
        data.setNeedsRecharge(currentRecharge == null);
        data.setCurrentMonth(currentRecharge == null ? emptyMonth(current, due) : rechargeStatus(currentRecharge));
        List<CollectionMonthData> pending = new ArrayList<>();
        recharges.entrySet().stream()
                .filter(entry -> !entry.getKey().equals(current) && entry.getValue().pendingAmount() > 0.009)
                .sorted(Map.Entry.comparingByKey())
                .forEach(entry -> pending.add(rechargeStatus(entry.getValue())));
        data.setPendingMonths(pending);
        data.setPayments(paymentRows(customer.getId(), user.shopId()));
        return data;
    }

    @Transactional
    public CollectionLookupData rechargeCurrentMonth(String customerId, AppUser user) {
        requireShopUser(user);
        CableCustomerRow customer = cableCustomerService.findActiveByCustomerId(user, customerId);
        YearMonth current = YearMonth.now();
        double due = nz(customer.getMonthlyAmount());
        if (due <= 0) {
            due = nz(lastAmount(customer.getId(), user.shopId()));
        }
        if (due <= 0) {
            throw new RuntimeException("Set monthly amount before recharge");
        }
        if (!hasRecharge(customer.getId(), user.shopId(), current)) {
            jdbcTemplate.update(
                    "INSERT INTO cable_recharges (customer_pk, customer_id, recharge_year, recharge_month, " +
                            "due_amount, paid_amount, pending_amount, recharge_date, recharge_time, uid, shop_id) " +
                            "VALUES (?,?,?,?,?,0,?,CURDATE(),CURTIME(),?,?)",
                    customer.getId(),
                    customer.getCustomerId(),
                    current.getYear(),
                    current.getMonthValue(),
                    round2(due),
                    round2(due),
                    user.getId(),
                    user.shopId()
            );
        }
        return lookup(customer.getCustomerId(), user);
    }

    @Transactional
    public CollectionLookupData save(CollectionSaveRequest request, AppUser user) {
        if (user == null || user.getId() == null) {
            throw new RuntimeException("Please login again");
        }
        String shopId = user.shopId();
        if (shopId == null || shopId.isBlank()) {
            throw new RuntimeException("Shop ID is missing from session");
        }
        if (request == null || request.getItems() == null || request.getItems().isEmpty()) {
            throw new RuntimeException("Select at least one month");
        }
        CableCustomerRow customer = cableCustomerService.findActiveByCustomerId(user, request.getCustomerId());
        YearMonth current = YearMonth.now();
        double due = nz(customer.getMonthlyAmount());
        Map<YearMonth, RechargeRow> recharges = rechargesForCustomer(customer.getId(), shopId);
        Set<YearMonth> unique = new LinkedHashSet<>();
        Long lastPaymentId = null;
        for (var item : request.getItems()) {
            if (item == null) {
                continue;
            }
            String payMode = item.getPayMode() == null ? "" : item.getPayMode().trim().toLowerCase();
            if (!PAY_MODES.contains(payMode)) {
                throw new RuntimeException("Choose Cash or UPI");
            }
            if (item.getAmount() == null || item.getAmount() <= 0) {
                throw new RuntimeException("Enter a valid amount");
            }
            YearMonth month = parseMonth(item.getMonth());
            if (month.isAfter(current) || !inService(month, customer)) {
                throw new RuntimeException("Invalid collection month");
            }
            if (!unique.add(month)) {
                continue;
            }
            RechargeRow existing = recharges.get(month);
            if (existing == null) {
                throw new RuntimeException(month.format(MONTH_LABEL) + " is not recharged");
            }
            if (existing != null && existing.pendingAmount() <= 0.009) {
                throw new RuntimeException(month.format(MONTH_LABEL) + " is already fully collected");
            }
            double baseDue = existing != null && existing.dueAmount() > 0 ? existing.dueAmount() : due;
            final double monthDue = baseDue > 0 ? baseDue : item.getAmount();
            double alreadyPaid = existing == null ? 0 : existing.paidAmount();
            double pendingAmt = existing == null ? monthDue : existing.pendingAmount();
            final double saveAmount = item.getAmount() > pendingAmt + 0.009 ? pendingAmt : item.getAmount();
            if (saveAmount <= 0) {
                throw new RuntimeException(month.format(MONTH_LABEL) + " is already fully collected");
            }
            KeyHolder keys = new GeneratedKeyHolder();
            jdbcTemplate.update(con -> {
                PreparedStatement ps = con.prepareStatement(
                        "INSERT INTO cable_collections (customer_pk, customer_id, collection_month, amount, due_amount, pay_mode, " +
                                "paid_date, paid_time, uid, shop_id) VALUES (?,?,?,?,?,?,CURDATE(),CURTIME(),?,?)",
                        Statement.RETURN_GENERATED_KEYS
                );
                ps.setLong(1, customer.getId());
                ps.setString(2, customer.getCustomerId());
                ps.setDate(3, Date.valueOf(month.atDay(1)));
                ps.setDouble(4, saveAmount);
                ps.setDouble(5, monthDue);
                ps.setString(6, payMode);
                ps.setLong(7, user.getId());
                ps.setString(8, shopId);
                return ps;
            }, keys);
            upsertRecharge(
                    customer.getId(),
                    customer.getCustomerId(),
                    month,
                    monthDue,
                    alreadyPaid + saveAmount,
                    Math.max(0, round2(monthDue - alreadyPaid - saveAmount)),
                    payMode,
                    user.getId(),
                    shopId
            );
            Number key = keys.getKey();
            if (key != null) {
                lastPaymentId = key.longValue();
            }
        }
        if (unique.isEmpty()) {
            throw new RuntimeException("Select at least one month");
        }
        CollectionLookupData data = lookup(customer.getCustomerId(), user);
        data.setLastPaymentId(lastPaymentId);
        return data;
    }

    public List<PendingCustomerRow> pendingCustomers(AppUser user) {
        requireShopUser(user);
        return jdbcTemplate.query(
                "SELECT r.customer_pk AS id, IFNULL(cu.customer_type,'') AS customerType, r.customer_id AS customerId, " +
                        "IFNULL(cu.name,'') AS name, IFNULL(cu.mobile,'') AS mobile, IFNULL(cu.area,'') AS area, " +
                        "DATE_FORMAT(cu.joining_date, '%d-%m-%Y') AS joiningDate, cu.monthly_amount AS monthlyAmount, " +
                        "COUNT(*) AS pendingMonths, COALESCE(SUM(r.pending_amount), 0) AS pendingAmount, " +
                        "DATE_FORMAT(MIN(STR_TO_DATE(CONCAT(r.recharge_year, '-', LPAD(r.recharge_month, 2, '0'), '-01'), '%Y-%m-%d')), '%b %Y') AS firstPendingMonth " +
                        "FROM cable_recharges r " +
                        "INNER JOIN cable_customers cu ON cu.id = r.customer_pk " +
                        "WHERE r.shop_id = ? AND r.pending_amount > 0.009 AND IFNULL(cu.is_active, 1) = 1 " +
                        "GROUP BY r.customer_pk, r.customer_id, cu.customer_type, cu.name, cu.mobile, cu.area, " +
                        "cu.joining_date, cu.monthly_amount " +
                        "ORDER BY pendingMonths DESC, pendingAmount DESC",
                (rs, i) -> {
                    PendingCustomerRow row = new PendingCustomerRow();
                    row.setId(rs.getLong("id"));
                    row.setCustomerType(rs.getString("customerType"));
                    row.setCustomerId(rs.getString("customerId"));
                    row.setName(rs.getString("name"));
                    row.setMobile(rs.getString("mobile"));
                    row.setArea(rs.getString("area"));
                    row.setJoiningDate(rs.getString("joiningDate"));
                    row.setMonthlyAmount(rs.getDouble("monthlyAmount"));
                    row.setPendingMonths(rs.getInt("pendingMonths"));
                    row.setPendingAmount(round2(rs.getDouble("pendingAmount")));
                    row.setFirstPendingMonth(rs.getString("firstPendingMonth"));
                    return row;
                },
                user.shopId()
        );
    }

    public PagedResult<PendingCustomerRow> pendingCustomersPage(AppUser user, String customerType, String search,
                                                                Integer page, Integer size) {
        String type = customerType == null ? "" : customerType.trim().toLowerCase();
        String q = search == null ? "" : search.trim().toLowerCase();
        List<PendingCustomerRow> filtered = new ArrayList<>();
        for (PendingCustomerRow row : pendingCustomers(user)) {
            if (!type.isEmpty() && !type.equalsIgnoreCase(row.getCustomerType() == null ? "" : row.getCustomerType())) {
                continue;
            }
            if (!q.isEmpty()) {
                String hay = (nzStr(row.getCustomerId()) + " " + nzStr(row.getName()) + " " +
                        nzStr(row.getMobile()) + " " + nzStr(row.getArea())).toLowerCase();
                if (!hay.contains(q)) {
                    continue;
                }
            }
            filtered.add(row);
        }
        return PagedResult.of(filtered, page, size);
    }

    private String nzStr(String value) {
        return value == null ? "" : value;
    }

    public CollectionReportData report(String from, String to, Long userId, String payMode, String customerType,
                                       AppUser user) {
        return report(from, to, userId, payMode, customerType, null, null, null, user);
    }

    public CollectionReportData report(String from, String to, Long userId, String payMode, String customerType,
                                       Integer page, Integer size, AppUser user) {
        return report(from, to, userId, payMode, customerType, null, page, size, user);
    }

    public CollectionReportData report(String from, String to, Long userId, String payMode, String customerType,
                                       String search, Integer page, Integer size, AppUser user) {
        if (user == null || user.getId() == null) {
            throw new RuntimeException("Please login again");
        }
        String shopId = user.shopId();
        if (shopId == null || shopId.isBlank()) {
            throw new RuntimeException("Shop ID is missing from session");
        }
        LocalDate fromDate = parseReportDate(from, "From date");
        LocalDate toDate = parseReportDate(to, "To date");
        if (toDate.isBefore(fromDate)) {
            throw new RuntimeException("To date cannot be before from date");
        }
        String mode = payMode == null ? "" : payMode.trim().toLowerCase();
        if (!mode.isEmpty() && !PAY_MODES.contains(mode)) {
            throw new RuntimeException("Choose Cash or UPI");
        }
        String type = customerType == null ? "" : customerType.trim().toLowerCase();
        if (!type.isEmpty() && !type.equals("cable") && !type.equals("wifi")) {
            throw new RuntimeException("Choose Cable or WiFi");
        }
        StringBuilder sql = new StringBuilder(
                "SELECT c.id, c.customer_id AS customerId, IFNULL(cu.name,'') AS customerName, " +
                        "IFNULL(cu.mobile,'') AS mobile, IFNULL(cu.area,'') AS area, " +
                        "IFNULL(cu.customer_type,'') AS customerType, c.collection_month, c.amount, c.pay_mode, " +
                        "DATE_FORMAT(c.paid_date, '%d-%m-%Y') AS paidDate, " +
                        "TIME_FORMAT(c.paid_time, '%h:%i %p') AS paidTime, " +
                        "IFNULL(NULLIF(u.fullName,''), u.user_name) AS collectedBy " +
                        "FROM cable_collections c " +
                        "LEFT JOIN cable_customers cu ON cu.id = c.customer_pk " +
                        "LEFT JOIN users u ON u.id = c.uid " +
                        "WHERE c.shop_id = ? AND IFNULL(c.is_cancelled,0) = 0 AND c.paid_date BETWEEN ? AND ?"
        );
        List<Object> args = new ArrayList<>();
        args.add(shopId);
        args.add(Date.valueOf(fromDate));
        args.add(Date.valueOf(toDate));
        if (userId != null && userId > 0) {
            sql.append(" AND c.uid = ?");
            args.add(userId);
        }
        if (!mode.isEmpty()) {
            sql.append(" AND LOWER(c.pay_mode) = ?");
            args.add(mode);
        }
        if (!type.isEmpty()) {
            sql.append(" AND LOWER(IFNULL(cu.customer_type,'')) = ?");
            args.add(type);
        }
        String term = search == null ? "" : search.trim();
        if (!term.isEmpty()) {
            sql.append(" AND (c.customer_id LIKE ? OR IFNULL(cu.name,'') LIKE ? OR IFNULL(cu.mobile,'') LIKE ? OR IFNULL(cu.area,'') LIKE ?)");
            String like = "%" + term + "%";
            args.add(like);
            args.add(like);
            args.add(like);
            args.add(like);
        }
        boolean paged = page != null;
        int p = PagedResult.pageOf(page);
        int s = PagedResult.sizeOf(size);
        CollectionReportData data = new CollectionReportData();
        if (paged) {
            String totalsSql =
                    "SELECT COUNT(*) AS cnt, COALESCE(SUM(c.amount),0) AS total, " +
                            "SUM(CASE WHEN LOWER(c.pay_mode) = 'upi' THEN c.amount ELSE 0 END) AS upi, " +
                            "SUM(CASE WHEN LOWER(c.pay_mode) <> 'upi' THEN c.amount ELSE 0 END) AS cash, " +
                            "SUM(CASE WHEN LOWER(IFNULL(cu.customer_type,'')) = 'wifi' THEN c.amount ELSE 0 END) AS wifi, " +
                            "SUM(CASE WHEN LOWER(IFNULL(cu.customer_type,'')) <> 'wifi' THEN c.amount ELSE 0 END) AS cable " +
                            sql.substring(sql.indexOf("FROM"));
            jdbcTemplate.query(totalsSql, rs -> {
                if (!rs.next()) {
                    return null;
                }
                data.setCount(rs.getInt("cnt"));
                data.setTotalAmount(round2(rs.getDouble("total")));
                data.setUpiTotal(round2(rs.getDouble("upi")));
                data.setCashTotal(round2(rs.getDouble("cash")));
                data.setWifiTotal(round2(rs.getDouble("wifi")));
                data.setCableTotal(round2(rs.getDouble("cable")));
                return null;
            }, args.toArray());
            sql.append(" ORDER BY c.paid_date DESC, c.id DESC LIMIT ? OFFSET ?");
            args.add(s);
            args.add((p - 1) * s);
            data.setPage(p);
            data.setSize(s);
        } else {
            sql.append(" ORDER BY c.paid_date DESC, c.id DESC");
        }
        List<CollectionReportRow> rows = jdbcTemplate.query(sql.toString(), (rs, i) -> {
            CollectionReportRow row = new CollectionReportRow();
            row.setId(rs.getLong("id"));
            row.setCustomerId(rs.getString("customerId"));
            row.setCustomerName(rs.getString("customerName"));
            row.setMobile(rs.getString("mobile"));
            row.setArea(rs.getString("area"));
            row.setCustomerType(rs.getString("customerType"));
            YearMonth month = YearMonth.from(rs.getDate("collection_month").toLocalDate());
            row.setMonth(month.atDay(1).toString());
            row.setMonthLabel(month.format(MONTH_LABEL));
            row.setAmount(round2(rs.getDouble("amount")));
            row.setPayMode(rs.getString("pay_mode"));
            row.setPaidDate(rs.getString("paidDate"));
            row.setPaidTime(rs.getString("paidTime"));
            row.setCollectedBy(rs.getString("collectedBy"));
            return row;
        }, args.toArray());
        data.setRows(rows);
        if (!paged) {
            double total = 0;
            double cash = 0;
            double upi = 0;
            double cable = 0;
            double wifi = 0;
            for (CollectionReportRow row : rows) {
                double amount = nz(row.getAmount());
                total += amount;
                if ("upi".equalsIgnoreCase(row.getPayMode())) {
                    upi += amount;
                } else {
                    cash += amount;
                }
                if ("wifi".equalsIgnoreCase(row.getCustomerType())) {
                    wifi += amount;
                } else {
                    cable += amount;
                }
            }
            data.setCount(rows.size());
            data.setTotalAmount(round2(total));
            data.setCashTotal(round2(cash));
            data.setUpiTotal(round2(upi));
            data.setCableTotal(round2(cable));
            data.setWifiTotal(round2(wifi));
        }
        return data;
    }

    public AccountReportData account(String from, String to, AppUser user) {
        CollectionReportData collection = report(from, to, null, null, null, user);
        LocalDate fromDate = parseReportDate(from, "From date");
        LocalDate toDate = parseReportDate(to, "To date");
        List<AccountExpenseRow> expenses = jdbcTemplate.query(
                "SELECT se.id, se.amount, se.expense_for AS expenseFor, " +
                        "DATE_FORMAT(se.exp_date, '%d-%m-%Y') AS expenseDate, " +
                        "TIME_FORMAT(se.exp_time, '%h:%i %p') AS expenseTime, " +
                        "IFNULL(NULLIF(u.fullName,''), u.user_name) AS userName " +
                        "FROM salon_expenses se " +
                        "LEFT JOIN users u ON u.id = se.uid " +
                        "WHERE se.shop_id = ? AND se.exp_date BETWEEN ? AND ? " +
                        "ORDER BY se.exp_date DESC, se.id DESC",
                (rs, i) -> {
                    AccountExpenseRow row = new AccountExpenseRow();
                    row.setId(rs.getLong("id"));
                    row.setAmount(round2(rs.getDouble("amount")));
                    row.setExpenseFor(rs.getString("expenseFor"));
                    row.setExpenseDate(rs.getString("expenseDate"));
                    row.setExpenseTime(rs.getString("expenseTime"));
                    row.setUserName(rs.getString("userName"));
                    return row;
                },
                user.shopId(),
                Date.valueOf(fromDate),
                Date.valueOf(toDate)
        );
        double expenseTotal = 0;
        for (AccountExpenseRow row : expenses) {
            expenseTotal += nz(row.getAmount());
        }
        AccountReportData data = new AccountReportData();
        data.setCollectionTotal(collection.getTotalAmount());
        data.setExpenseTotal(round2(expenseTotal));
        data.setFinalAmount(round2(nz(collection.getTotalAmount()) - expenseTotal));
        data.setCollectionCount(collection.getCount());
        data.setExpenseCount(expenses.size());
        data.setCashTotal(collection.getCashTotal());
        data.setUpiTotal(collection.getUpiTotal());
        data.setCableTotal(collection.getCableTotal());
        data.setWifiTotal(collection.getWifiTotal());
        data.setExpenses(expenses);
        return data;
    }

    public DashboardData dashboard(Integer year, Integer month, String from, String to, AppUser user) {
        requireShopUser(user);
        LocalDate now = LocalDate.now();
        LocalDate fromDate;
        LocalDate toDate;
        boolean monthMode;
        if (from != null && !from.isBlank() && to != null && !to.isBlank()) {
            fromDate = parseReportDate(from, "From date");
            toDate = parseReportDate(to, "To date");
            if (toDate.isBefore(fromDate)) {
                throw new RuntimeException("To date cannot be before from date");
            }
            YearMonth fromMonth = YearMonth.from(fromDate);
            monthMode = fromDate.getDayOfMonth() == 1
                    && toDate.equals(fromMonth.atEndOfMonth())
                    && fromMonth.equals(YearMonth.from(toDate));
        } else {
            int y = year == null ? now.getYear() : year;
            int m = month == null ? now.getMonthValue() : month;
            if (m < 1) {
                m = 1;
            }
            if (m > 12) {
                m = 12;
            }
            YearMonth selected = YearMonth.of(y, m);
            fromDate = selected.atDay(1);
            toDate = selected.atEndOfMonth();
            monthMode = true;
        }
        YearMonth ym = YearMonth.from(toDate);
        long days = ChronoUnit.DAYS.between(fromDate, toDate) + 1;
        LocalDate prevFrom;
        LocalDate prevTo;
        if (monthMode) {
            YearMonth prev = YearMonth.from(fromDate).minusMonths(1);
            prevFrom = prev.atDay(1);
            prevTo = prev.atEndOfMonth();
        } else {
            prevTo = fromDate.minusDays(1);
            prevFrom = prevTo.minusDays(days - 1);
        }
        AccountReportData current = account(fromDate.toString(), toDate.toString(), user);
        AccountReportData last = account(prevFrom.toString(), prevTo.toString(), user);
        String shopId = user.shopId();

        List<CableCustomerRow> customers = cableCustomerService.list(user, null, false);
        int active = 0;
        int cableCustomers = 0;
        int wifiCustomers = 0;
        double expected = 0;
        for (CableCustomerRow customer : customers) {
            boolean isActive = customer.getIsActive() == null || customer.getIsActive() == 1;
            if (isActive) {
                active++;
                if ("wifi".equalsIgnoreCase(customer.getCustomerType())) {
                    wifiCustomers++;
                } else {
                    cableCustomers++;
                }
            }
            YearMonth joinMonth = yearMonth(customer.getJoiningDateIso());
            if (!joinMonth.isAfter(ym) && inService(ym, customer)) {
                expected += nz(customer.getMonthlyAmount());
            }
        }
        int pendingCount = count(
                "SELECT COUNT(DISTINCT r.customer_pk) FROM cable_recharges r " +
                        "INNER JOIN cable_customers cu ON cu.id = r.customer_pk " +
                        "WHERE r.shop_id = ? AND r.pending_amount > 0.009 AND IFNULL(cu.is_active, 1) = 1",
                shopId
        );
        double pendingAmount = sum(
                "SELECT COALESCE(SUM(r.pending_amount), 0) FROM cable_recharges r " +
                        "INNER JOIN cable_customers cu ON cu.id = r.customer_pk " +
                        "WHERE r.shop_id = ? AND r.pending_amount > 0.009 AND IFNULL(cu.is_active, 1) = 1",
                shopId
        );

        DashboardData data = new DashboardData();
        data.setYear(fromDate.getYear());
        data.setMonth(fromDate.getMonthValue());
        data.setFrom(fromDate.toString());
        data.setTo(toDate.toString());
        data.setLabel(dashboardLabel(fromDate, toDate, monthMode));
        data.setCollectionTotal(current.getCollectionTotal());
        data.setLastCollectionTotal(last.getCollectionTotal());
        data.setCollectionPct(pctChange(nz(current.getCollectionTotal()), nz(last.getCollectionTotal())));
        data.setCashTotal(current.getCashTotal());
        data.setUpiTotal(current.getUpiTotal());
        data.setCableTotal(current.getCableTotal());
        data.setWifiTotal(current.getWifiTotal());
        data.setCollectionCount(current.getCollectionCount());
        data.setExpenseTotal(current.getExpenseTotal());
        data.setLastExpenseTotal(last.getExpenseTotal());
        data.setExpensePct(pctChange(nz(current.getExpenseTotal()), nz(last.getExpenseTotal())));
        data.setExpenseCount(current.getExpenseCount());
        data.setFinalAmount(current.getFinalAmount());
        data.setLastFinalAmount(last.getFinalAmount());
        data.setFinalPct(pctChange(nz(current.getFinalAmount()), nz(last.getFinalAmount())));
        data.setTodayCollection(sum(
                "SELECT COALESCE(SUM(amount),0) FROM cable_collections " +
                        "WHERE shop_id = ? AND IFNULL(is_cancelled,0) = 0 AND paid_date = CURDATE()",
                shopId
        ));
        data.setTodayCount(count(
                "SELECT COUNT(*) FROM cable_collections " +
                        "WHERE shop_id = ? AND IFNULL(is_cancelled,0) = 0 AND paid_date = CURDATE()",
                shopId
        ));
        data.setActiveCustomers(active);
        data.setCableCustomers(cableCustomers);
        data.setWifiCustomers(wifiCustomers);
        data.setPendingCustomers(pendingCount);
        data.setPendingAmount(round2(pendingAmount));
        data.setNewConnections(count(
                "SELECT COUNT(*) FROM cable_customers WHERE shop_id = ? AND joining_date BETWEEN ? AND ?",
                shopId,
                Date.valueOf(fromDate),
                Date.valueOf(toDate)
        ));
        data.setDisconnections(count(
                "SELECT COUNT(*) FROM cable_customers WHERE shop_id = ? AND disconnect_date BETWEEN ? AND ?",
                shopId,
                Date.valueOf(fromDate),
                Date.valueOf(toDate)
        ));
        data.setExpectedAmount(round2(expected));
        data.setMonthDueCollected(sum(
                "SELECT COALESCE(SUM(amount),0) FROM cable_collections " +
                        "WHERE shop_id = ? AND IFNULL(is_cancelled,0) = 0 AND collection_month = ?",
                shopId,
                Date.valueOf(ym.atDay(1))
        ));
        data.setDaily(dailyRows(shopId, fromDate, toDate));
        data.setCollectors(collectorRows(shopId, fromDate, toDate));
        return data;
    }

    @Transactional
    public void updateCollection(Long id, CollectionUpdateRequest request, AppUser user) {
        requireShopUser(user);
        if (id == null || id <= 0) {
            throw new RuntimeException("Collection not found");
        }
        String reason = request == null || request.getReason() == null ? "" : request.getReason().trim();
        if (reason.isEmpty()) {
            throw new RuntimeException("Reason is required");
        }
        if (request.getAmount() == null || request.getAmount() <= 0) {
            throw new RuntimeException("Enter a valid amount");
        }
        String payMode = request.getPayMode() == null ? "" : request.getPayMode().trim().toLowerCase();
        if (!PAY_MODES.contains(payMode)) {
            throw new RuntimeException("Choose Cash or UPI");
        }
        Date paidDate = Date.valueOf(parseReportDate(request.getPaidDate(), "Paid date"));
        var current = findOpenCollection(id, user.shopId());
        int updated = jdbcTemplate.update(
                "UPDATE cable_collections SET amount = ?, pay_mode = ?, paid_date = ? " +
                        "WHERE id = ? AND shop_id = ? AND IFNULL(is_cancelled,0) = 0",
                request.getAmount(),
                payMode,
                paidDate,
                id,
                user.shopId()
        );
        if (updated == 0) {
            throw new RuntimeException("Collection not found");
        }
        writeLog(
                id,
                "edit",
                current.customerId(),
                current.month(),
                current.amount(),
                request.getAmount(),
                current.payMode(),
                payMode,
                current.paidDate(),
                paidDate.toLocalDate(),
                reason,
                user
        );
        syncRechargeTotals(current.customerPk(), current.customerId(), YearMonth.from(current.month()), user.shopId());
    }

    @Transactional
    public void cancelCollection(Long id, CollectionCancelRequest request, AppUser user) {
        requireShopUser(user);
        if (id == null || id <= 0) {
            throw new RuntimeException("Collection not found");
        }
        String reason = request == null || request.getReason() == null ? "" : request.getReason().trim();
        if (reason.isEmpty()) {
            throw new RuntimeException("Cancel reason is required");
        }
        var current = findOpenCollection(id, user.shopId());
        int updated = jdbcTemplate.update(
                "UPDATE cable_collections SET is_cancelled = 1 WHERE id = ? AND shop_id = ? AND IFNULL(is_cancelled,0) = 0",
                id,
                user.shopId()
        );
        if (updated == 0) {
            throw new RuntimeException("Collection not found or already cancelled");
        }
        writeLog(
                id,
                "cancel",
                current.customerId(),
                current.month(),
                current.amount(),
                current.amount(),
                current.payMode(),
                current.payMode(),
                current.paidDate(),
                current.paidDate(),
                reason,
                user
        );
        syncRechargeTotals(current.customerPk(), current.customerId(), YearMonth.from(current.month()), user.shopId());
    }

    public List<CollectionLogRow> editLog(String from, String to, AppUser user) {
        requireShopUser(user);
        LocalDate fromDate = parseReportDate(from, "From date");
        LocalDate toDate = parseReportDate(to, "To date");
        if (toDate.isBefore(fromDate)) {
            throw new RuntimeException("To date cannot be before from date");
        }
        return jdbcTemplate.query(
                "SELECT l.id, l.collection_id, l.action, l.customer_id, IFNULL(cu.name,'') AS customerName, " +
                        "l.collection_month, l.old_amount, l.new_amount, l.old_pay_mode, l.new_pay_mode, " +
                        "DATE_FORMAT(l.old_paid_date, '%d-%m-%Y') AS oldPaidDate, " +
                        "DATE_FORMAT(l.new_paid_date, '%d-%m-%Y') AS newPaidDate, " +
                        "IFNULL(l.reason,'') AS reason, " +
                        "IFNULL(NULLIF(u.fullName,''), u.user_name) AS userName, " +
                        "DATE_FORMAT(l.log_date, '%d-%m-%Y') AS logDate, " +
                        "TIME_FORMAT(l.log_time, '%h:%i %p') AS logTime " +
                        "FROM cable_collection_logs l " +
                        "LEFT JOIN cable_customers cu ON cu.customer_id = l.customer_id AND cu.shop_id = l.shop_id " +
                        "LEFT JOIN users u ON u.id = l.uid " +
                        "WHERE l.shop_id = ? AND l.log_date BETWEEN ? AND ? " +
                        "ORDER BY l.log_date DESC, l.id DESC",
                (rs, i) -> {
                    CollectionLogRow row = new CollectionLogRow();
                    row.setId(rs.getLong("id"));
                    row.setCollectionId(rs.getLong("collection_id"));
                    row.setAction(rs.getString("action"));
                    row.setCustomerId(rs.getString("customer_id"));
                    row.setCustomerName(rs.getString("customerName"));
                    java.sql.Date month = rs.getDate("collection_month");
                    if (month != null) {
                        row.setMonthLabel(YearMonth.from(month.toLocalDate()).format(MONTH_LABEL));
                    }
                    row.setOldAmount(round2(rs.getDouble("old_amount")));
                    row.setNewAmount(round2(rs.getDouble("new_amount")));
                    row.setOldPayMode(rs.getString("old_pay_mode"));
                    row.setNewPayMode(rs.getString("new_pay_mode"));
                    row.setOldPaidDate(rs.getString("oldPaidDate"));
                    row.setNewPaidDate(rs.getString("newPaidDate"));
                    row.setReason(rs.getString("reason"));
                    row.setUserName(rs.getString("userName"));
                    row.setLogDate(rs.getString("logDate"));
                    row.setLogTime(rs.getString("logTime"));
                    return row;
                },
                user.shopId(),
                Date.valueOf(fromDate),
                Date.valueOf(toDate)
        );
    }

    private record OpenCollection(Long customerPk, String customerId, LocalDate month, double amount, String payMode, LocalDate paidDate) {
    }

    private OpenCollection findOpenCollection(Long id, String shopId) {
        List<OpenCollection> rows = jdbcTemplate.query(
                "SELECT customer_pk, customer_id, collection_month, amount, pay_mode, paid_date " +
                        "FROM cable_collections WHERE id = ? AND shop_id = ? AND IFNULL(is_cancelled,0) = 0 LIMIT 1",
                (rs, i) -> new OpenCollection(
                        rs.getLong("customer_pk"),
                        rs.getString("customer_id"),
                        rs.getDate("collection_month").toLocalDate(),
                        rs.getDouble("amount"),
                        rs.getString("pay_mode"),
                        rs.getDate("paid_date").toLocalDate()
                ),
                id,
                shopId
        );
        if (rows.isEmpty()) {
            throw new RuntimeException("Collection not found or already cancelled");
        }
        return rows.get(0);
    }

    private void writeLog(Long collectionId, String action, String customerId, LocalDate month,
                          Double oldAmount, Double newAmount, String oldPayMode, String newPayMode,
                          LocalDate oldPaidDate, LocalDate newPaidDate, String reason, AppUser user) {
        jdbcTemplate.update(
                "INSERT INTO cable_collection_logs (collection_id, action, customer_id, collection_month, " +
                        "old_amount, new_amount, old_pay_mode, new_pay_mode, old_paid_date, new_paid_date, " +
                        "reason, uid, shop_id, log_date, log_time) " +
                        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,CURDATE(),CURTIME())",
                collectionId,
                action,
                customerId,
                Date.valueOf(month),
                oldAmount,
                newAmount,
                oldPayMode,
                newPayMode,
                Date.valueOf(oldPaidDate),
                Date.valueOf(newPaidDate),
                reason,
                user.getId(),
                user.shopId()
        );
    }

    private void requireShopUser(AppUser user) {
        if (user == null || user.getId() == null) {
            throw new RuntimeException("Please login again");
        }
        if (user.shopId() == null || user.shopId().isBlank()) {
            throw new RuntimeException("Shop ID is missing from session");
        }
    }

    private LocalDate parseReportDate(String raw, String label) {
        if (raw == null || raw.isBlank()) {
            throw new RuntimeException(label + " is required");
        }
        try {
            return LocalDate.parse(raw.trim());
        } catch (DateTimeParseException ex) {
            throw new RuntimeException("Invalid " + label.toLowerCase());
        }
    }

    private boolean inService(YearMonth month, CableCustomerRow customer) {
        YearMonth disconnect = yearMonthOrNull(customer == null ? null : customer.getDisconnectDateIso());
        YearMonth reconnect = yearMonthOrNull(customer == null ? null : customer.getReconnectDateIso());
        return disconnect == null || reconnect == null || !month.isAfter(disconnect) || !month.isBefore(reconnect);
    }

    private YearMonth yearMonthOrNull(String isoDate) {
        if (isoDate == null || isoDate.isBlank()) {
            return null;
        }
        try {
            return YearMonth.from(LocalDate.parse(isoDate.trim()));
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private CollectionMonthData emptyMonth(YearMonth month, double due) {
        CollectionMonthData row = new CollectionMonthData();
        row.setMonth(month.atDay(1).toString());
        row.setLabel(month.format(MONTH_LABEL));
        row.setRecharged(false);
        row.setPaid(false);
        row.setDue(round2(due));
        row.setPaidAmount(0d);
        row.setBalance(round2(due));
        row.setAmount(round2(due));
        return row;
    }

    private CollectionMonthData rechargeStatus(RechargeRow recharge) {
        CollectionMonthData row = new CollectionMonthData();
        row.setMonth(recharge.month().atDay(1).toString());
        row.setLabel(recharge.month().format(MONTH_LABEL));
        row.setRecharged(true);
        row.setDue(round2(recharge.dueAmount()));
        row.setPaidAmount(round2(recharge.paidAmount()));
        row.setBalance(round2(recharge.pendingAmount()));
        row.setAmount(recharge.pendingAmount() > 0 ? round2(recharge.pendingAmount()) : round2(recharge.dueAmount()));
        row.setPaid(recharge.pendingAmount() <= 0.009 && recharge.paidAmount() > 0);
        if (recharge.paidDate() != null) {
            row.setPaidDate(recharge.paidDate().format(PAID_LABEL));
            row.setPaidDateIso(recharge.paidDate().toString());
        }
        if (recharge.rechargeDate() != null) {
            row.setRechargeDate(recharge.rechargeDate().format(PAID_LABEL));
        }
        row.setPayMode(recharge.payMode());
        return row;
    }

    private boolean hasRecharge(Long customerPk, String shopId, YearMonth month) {
        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM cable_recharges WHERE shop_id = ? AND customer_pk = ? " +
                        "AND recharge_year = ? AND recharge_month = ?",
                Integer.class,
                shopId,
                customerPk,
                month.getYear(),
                month.getMonthValue()
        );
        return exists != null && exists > 0;
    }

    private Map<YearMonth, RechargeRow> rechargesForCustomer(Long customerPk, String shopId) {
        Map<YearMonth, RechargeRow> rows = new HashMap<>();
        jdbcTemplate.query(
                "SELECT recharge_year, recharge_month, due_amount, paid_amount, pending_amount, " +
                        "paid_date, recharge_date, pay_mode " +
                        "FROM cable_recharges WHERE shop_id = ? AND customer_pk = ?",
                rs -> {
                    while (rs.next()) {
                        YearMonth month = YearMonth.of(rs.getInt("recharge_year"), rs.getInt("recharge_month"));
                        Date paid = rs.getDate("paid_date");
                        Date recharged = rs.getDate("recharge_date");
                        rows.put(month, new RechargeRow(
                                month,
                                rs.getDouble("due_amount"),
                                rs.getDouble("paid_amount"),
                                rs.getDouble("pending_amount"),
                                paid == null ? null : paid.toLocalDate(),
                                recharged == null ? (paid == null ? null : paid.toLocalDate()) : recharged.toLocalDate(),
                                rs.getString("pay_mode")
                        ));
                    }
                    return null;
                },
                shopId,
                customerPk
        );
        return rows;
    }

    private void upsertRecharge(Long customerPk, String customerId, YearMonth month, double dueAmount,
                               double paidAmount, double pendingAmount, String payMode, Long userId, String shopId) {
        int updated = jdbcTemplate.update(
                "UPDATE cable_recharges SET due_amount = ?, paid_amount = ?, pending_amount = ?, " +
                        "pay_mode = ?, paid_date = CURDATE(), paid_time = CURTIME(), uid = ? " +
                        "WHERE shop_id = ? AND customer_pk = ? AND recharge_year = ? AND recharge_month = ?",
                round2(dueAmount),
                round2(paidAmount),
                round2(pendingAmount),
                payMode,
                userId,
                shopId,
                customerPk,
                month.getYear(),
                month.getMonthValue()
        );
        if (updated == 0) {
            jdbcTemplate.update(
                    "INSERT INTO cable_recharges (customer_pk, customer_id, recharge_year, recharge_month, " +
                            "due_amount, paid_amount, pending_amount, pay_mode, paid_date, paid_time, uid, shop_id) " +
                            "VALUES (?,?,?,?,?,?,?,?,CURDATE(),CURTIME(),?,?)",
                    customerPk,
                    customerId,
                    month.getYear(),
                    month.getMonthValue(),
                    round2(dueAmount),
                    round2(paidAmount),
                    round2(pendingAmount),
                    payMode,
                    userId,
                    shopId
            );
        }
    }

    private void syncRechargeTotals(Long customerPk, String customerId, YearMonth month, String shopId) {
        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM cable_recharges WHERE shop_id = ? AND customer_pk = ? " +
                        "AND recharge_year = ? AND recharge_month = ?",
                Integer.class,
                shopId,
                customerPk,
                month.getYear(),
                month.getMonthValue()
        );
        if (exists == null || exists == 0) {
            return;
        }
        jdbcTemplate.update(
                "UPDATE cable_recharges r SET " +
                        "paid_amount = IFNULL((SELECT SUM(c.amount) FROM cable_collections c " +
                        "WHERE c.shop_id = r.shop_id AND c.customer_pk = r.customer_pk " +
                        "AND YEAR(c.collection_month) = r.recharge_year AND MONTH(c.collection_month) = r.recharge_month " +
                        "AND IFNULL(c.is_cancelled, 0) = 0), 0), " +
                        "pending_amount = GREATEST(0, r.due_amount - IFNULL((SELECT SUM(c.amount) FROM cable_collections c " +
                        "WHERE c.shop_id = r.shop_id AND c.customer_pk = r.customer_pk " +
                        "AND YEAR(c.collection_month) = r.recharge_year AND MONTH(c.collection_month) = r.recharge_month " +
                        "AND IFNULL(c.is_cancelled, 0) = 0), 0)) " +
                        "WHERE r.shop_id = ? AND r.customer_pk = ? AND r.recharge_year = ? AND r.recharge_month = ?",
                shopId,
                customerPk,
                month.getYear(),
                month.getMonthValue()
        );
        if (customerId != null) {
            jdbcTemplate.update(
                    "UPDATE cable_recharges SET customer_id = ? WHERE shop_id = ? AND customer_pk = ? " +
                            "AND recharge_year = ? AND recharge_month = ? AND customer_id <> ?",
                    customerId,
                    shopId,
                    customerPk,
                    month.getYear(),
                    month.getMonthValue(),
                    customerId
            );
        }
    }

    private List<CollectionPaymentRow> paymentRows(Long customerPk, String shopId) {
        return jdbcTemplate.query(
                "SELECT c.id, c.collection_month, c.amount, c.pay_mode, " +
                        "DATE_FORMAT(c.paid_date, '%d-%m-%Y') AS paidDate, " +
                        "TIME_FORMAT(c.paid_time, '%h:%i %p') AS paidTime, " +
                        "DATE_FORMAT(IFNULL(r.recharge_date, r.paid_date), '%d-%m-%Y') AS rechargeDate, " +
                        "IFNULL(NULLIF(u.fullName,''), u.user_name) AS collectedBy " +
                        "FROM cable_collections c " +
                        "LEFT JOIN users u ON u.id = c.uid " +
                        "LEFT JOIN cable_recharges r ON r.shop_id = c.shop_id AND r.customer_pk = c.customer_pk " +
                        "AND r.recharge_year = YEAR(c.collection_month) AND r.recharge_month = MONTH(c.collection_month) " +
                        "WHERE c.shop_id = ? AND c.customer_pk = ? AND IFNULL(c.is_cancelled,0) = 0 " +
                        "ORDER BY c.collection_month DESC, c.paid_date DESC, c.id DESC",
                (rs, i) -> {
                    CollectionPaymentRow row = new CollectionPaymentRow();
                    row.setId(rs.getLong("id"));
                    YearMonth month = YearMonth.from(rs.getDate("collection_month").toLocalDate());
                    row.setMonth(month.atDay(1).toString());
                    row.setMonthLabel(month.format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH)));
                    row.setAmount(round2(rs.getDouble("amount")));
                    row.setPayMode(rs.getString("pay_mode"));
                    row.setPaidDate(rs.getString("paidDate"));
                    row.setPaidTime(rs.getString("paidTime"));
                    row.setRechargeDate(rs.getString("rechargeDate"));
                    row.setCollectedBy(rs.getString("collectedBy"));
                    return row;
                },
                shopId,
                customerPk
        );
    }

    private Double lastAmount(Long customerPk, String shopId) {
        List<Double> rows = jdbcTemplate.query(
                "SELECT amount FROM cable_collections WHERE shop_id = ? AND customer_pk = ? AND IFNULL(is_cancelled,0) = 0 " +
                        "ORDER BY paid_date DESC, id DESC LIMIT 1",
                (rs, i) -> rs.getDouble("amount"),
                shopId,
                customerPk
        );
        return rows.isEmpty() ? null : rows.get(0);
    }

    private YearMonth yearMonth(String isoDate) {
        if (isoDate == null || isoDate.isBlank()) {
            return YearMonth.now();
        }
        try {
            return YearMonth.from(LocalDate.parse(isoDate.trim()));
        } catch (DateTimeParseException ex) {
            return YearMonth.now();
        }
    }

    private YearMonth parseMonth(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new RuntimeException("Collection month is required");
        }
        try {
            return YearMonth.from(LocalDate.parse(raw.trim()));
        } catch (DateTimeParseException ex) {
            throw new RuntimeException("Invalid collection month");
        }
    }

    private String dashboardLabel(LocalDate fromDate, LocalDate toDate, boolean monthMode) {
        if (fromDate.equals(toDate)) {
            return fromDate.format(DAY_LABEL);
        }
        if (monthMode) {
            return YearMonth.from(fromDate).format(MONTH_LABEL);
        }
        return fromDate.format(DAY_LABEL) + " – " + toDate.format(DAY_LABEL);
    }

    private List<DashboardDay> dailyRows(String shopId, LocalDate fromDate, LocalDate toDate) {
        Map<LocalDate, DashboardDay> byDay = new HashMap<>();
        jdbcTemplate.query(
                "SELECT paid_date, " +
                        "SUM(CASE WHEN LOWER(pay_mode) = 'upi' THEN amount ELSE 0 END) AS upi, " +
                        "SUM(CASE WHEN LOWER(pay_mode) <> 'upi' THEN amount ELSE 0 END) AS cash, " +
                        "SUM(amount) AS total " +
                        "FROM cable_collections WHERE shop_id = ? AND IFNULL(is_cancelled,0) = 0 " +
                        "AND paid_date BETWEEN ? AND ? GROUP BY paid_date",
                (rs, i) -> {
                    LocalDate day = rs.getDate("paid_date").toLocalDate();
                    byDay.put(day, dashboardDay(day, rs.getDouble("cash"), rs.getDouble("upi"), rs.getDouble("total")));
                    return null;
                },
                shopId,
                Date.valueOf(fromDate),
                Date.valueOf(toDate)
        );
        List<DashboardDay> rows = new ArrayList<>();
        for (LocalDate day = fromDate; !day.isAfter(toDate); day = day.plusDays(1)) {
            DashboardDay row = byDay.get(day);
            if (row == null) {
                row = dashboardDay(day, 0, 0, 0);
            }
            rows.add(row);
        }
        return rows;
    }

    private DashboardDay dashboardDay(LocalDate day, double cash, double upi, double total) {
        DashboardDay row = new DashboardDay();
        row.setDate(day.format(DAY_SHORT));
        row.setIso(day.toString());
        row.setCash(round2(cash));
        row.setUpi(round2(upi));
        row.setTotal(round2(total));
        return row;
    }

    private List<DashboardCollector> collectorRows(String shopId, LocalDate fromDate, LocalDate toDate) {
        return jdbcTemplate.query(
                "SELECT c.uid AS userId, IFNULL(NULLIF(u.fullName,''), IFNULL(u.user_name,'User')) AS name, " +
                        "COUNT(*) AS cnt, " +
                        "SUM(CASE WHEN LOWER(c.pay_mode) = 'upi' THEN c.amount ELSE 0 END) AS upi, " +
                        "SUM(CASE WHEN LOWER(c.pay_mode) <> 'upi' THEN c.amount ELSE 0 END) AS cash, " +
                        "SUM(c.amount) AS total " +
                        "FROM cable_collections c LEFT JOIN users u ON u.id = c.uid " +
                        "WHERE c.shop_id = ? AND IFNULL(c.is_cancelled,0) = 0 AND c.paid_date BETWEEN ? AND ? " +
                        "GROUP BY c.uid, IFNULL(NULLIF(u.fullName,''), IFNULL(u.user_name,'User')) ORDER BY total DESC",
                (rs, i) -> {
                    DashboardCollector row = new DashboardCollector();
                    long userId = rs.getLong("userId");
                    row.setUserId(rs.wasNull() ? null : userId);
                    row.setName(rs.getString("name"));
                    row.setCount(rs.getInt("cnt"));
                    row.setUpi(round2(rs.getDouble("upi")));
                    row.setCash(round2(rs.getDouble("cash")));
                    row.setTotal(round2(rs.getDouble("total")));
                    return row;
                },
                shopId,
                Date.valueOf(fromDate),
                Date.valueOf(toDate)
        );
    }

    private double sum(String sql, Object... args) {
        Double value = jdbcTemplate.query(sql, rs -> rs.next() ? rs.getDouble(1) : 0d, args);
        return round2(value == null ? 0 : value);
    }

    private int count(String sql, Object... args) {
        Integer value = jdbcTemplate.query(sql, rs -> rs.next() ? rs.getInt(1) : 0, args);
        return value == null ? 0 : value;
    }

    private double pctChange(double current, double last) {
        if (last == 0) {
            return 0;
        }
        return round2(((current - last) / last) * 100);
    }

    private double nz(Double value) {
        return value == null ? 0 : value;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private record RechargeRow(YearMonth month, double dueAmount, double paidAmount, double pendingAmount,
                              LocalDate paidDate, LocalDate rechargeDate, String payMode) {
    }
}
