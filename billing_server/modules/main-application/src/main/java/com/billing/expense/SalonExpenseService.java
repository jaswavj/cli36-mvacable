package com.billing.expense;

import com.billing.data.AppUser;
import com.billing.expense.dto.SalonExpenseCancelRequest;
import com.billing.expense.dto.SalonExpenseReportData;
import com.billing.expense.dto.SalonExpenseRow;
import com.billing.expense.dto.SalonExpenseSaveRequest;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SalonExpenseService {

    private static final Set<String> PAY_MODES = Set.of("cash", "upi");
    private static final Set<String> TYPES = Set.of("cable", "wifi");

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void ensureTable() {
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS salon_expenses (" +
                        "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
                        "amount DECIMAL(12,2) NOT NULL," +
                        "expense_for VARCHAR(255) NOT NULL," +
                        "pay_mode VARCHAR(10) NOT NULL DEFAULT 'cash'," +
                        "customer_type VARCHAR(10) NOT NULL DEFAULT 'cable'," +
                        "shop_id VARCHAR(255) DEFAULT NULL," +
                        "uid INT DEFAULT NULL," +
                        "exp_date DATE DEFAULT NULL," +
                        "exp_time TIME DEFAULT NULL," +
                        "PRIMARY KEY (id)" +
                        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
        ensureColumn("pay_mode", "VARCHAR(10) NOT NULL DEFAULT 'cash' AFTER expense_for");
        ensureColumn("customer_type", "VARCHAR(10) NOT NULL DEFAULT 'cable' AFTER pay_mode");
        ensureColumn("is_cancelled", "TINYINT NOT NULL DEFAULT 0 AFTER exp_time");
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS salon_expense_logs (" +
                        "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
                        "expense_id INT NOT NULL," +
                        "action VARCHAR(20) NOT NULL," +
                        "old_amount DECIMAL(12,2) DEFAULT NULL," +
                        "new_amount DECIMAL(12,2) DEFAULT NULL," +
                        "old_expense_for VARCHAR(255) DEFAULT NULL," +
                        "new_expense_for VARCHAR(255) DEFAULT NULL," +
                        "reason TEXT," +
                        "uid INT DEFAULT NULL," +
                        "shop_id VARCHAR(255) DEFAULT NULL," +
                        "log_date DATE DEFAULT NULL," +
                        "log_time TIME DEFAULT NULL," +
                        "PRIMARY KEY (id)," +
                        "KEY idx_salon_expense_log (shop_id, log_date)" +
                        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
    }

    private void ensureColumn(String column, String definition) {
        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS " +
                        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'salon_expenses' AND COLUMN_NAME = ?",
                Integer.class,
                column
        );
        if (exists == null || exists == 0) {
            jdbcTemplate.execute("ALTER TABLE salon_expenses ADD COLUMN " + column + " " + definition);
        }
    }

    @Transactional
    public Map<String, Object> save(SalonExpenseSaveRequest request, AppUser user) {
        if (request == null || request.getAmount() == null || request.getAmount() <= 0) {
            throw new RuntimeException("Enter a valid amount");
        }
        String expenseFor = request.getExpenseFor() == null ? "" : request.getExpenseFor().trim();
        if (expenseFor.isEmpty()) {
            throw new RuntimeException("Enter expense for");
        }
        String shopId = user == null ? "" : user.shopId();
        Long uid = user == null ? null : user.getId();
        if (shopId == null || shopId.isBlank()) {
            throw new RuntimeException("Shop ID is missing from session");
        }
        if (uid == null) {
            throw new RuntimeException("Not signed in");
        }
        String payMode = normalizePayMode(request.getPayMode());
        String customerType = normalizeType(request.getCustomerType());

        KeyHolder keys = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO salon_expenses (amount, expense_for, pay_mode, customer_type, shop_id, uid, exp_date, exp_time) " +
                            "VALUES (?, ?, ?, ?, ?, ?, CURDATE(), CURTIME())",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setDouble(1, request.getAmount());
            ps.setString(2, expenseFor);
            ps.setString(3, payMode);
            ps.setString(4, customerType);
            ps.setString(5, shopId);
            ps.setLong(6, uid);
            return ps;
        }, keys);
        Number key = keys.getKey();
        return Map.of("id", key == null ? 0 : key.longValue());
    }

    @Transactional
    public void update(Long id, SalonExpenseSaveRequest request, AppUser user) {
        if (id == null || id <= 0) {
            throw new RuntimeException("Expense not found");
        }
        if (request == null || request.getAmount() == null || request.getAmount() <= 0) {
            throw new RuntimeException("Enter a valid amount");
        }
        String expenseFor = request.getExpenseFor() == null ? "" : request.getExpenseFor().trim();
        if (expenseFor.isEmpty()) {
            throw new RuntimeException("Enter expense for");
        }
        String shopId = user == null ? "" : user.shopId();
        if (shopId == null || shopId.isBlank()) {
            throw new RuntimeException("Shop ID is missing from session");
        }
        String payMode = normalizePayMode(request.getPayMode());
        String customerType = normalizeType(request.getCustomerType());
        OpenExpense current = openExpense(id, shopId);
        int updated = jdbcTemplate.update(
                "UPDATE salon_expenses SET amount = ?, expense_for = ?, pay_mode = ?, customer_type = ? " +
                        "WHERE id = ? AND shop_id = ? AND IFNULL(is_cancelled,0) = 0",
                request.getAmount(),
                expenseFor,
                payMode,
                customerType,
                id,
                shopId
        );
        if (updated == 0) {
            throw new RuntimeException("Expense not found or already cancelled");
        }
        writeLog(id, "edit", current.amount(), request.getAmount(), current.expenseFor(), expenseFor, "edit", user);
    }

    @Transactional
    public void cancel(Long id, SalonExpenseCancelRequest request, AppUser user) {
        if (id == null || id <= 0) {
            throw new RuntimeException("Expense not found");
        }
        String reason = request == null || request.getReason() == null ? "" : request.getReason().trim();
        if (reason.isEmpty()) {
            throw new RuntimeException("Cancel reason is required");
        }
        String shopId = user == null ? "" : user.shopId();
        if (shopId == null || shopId.isBlank()) {
            throw new RuntimeException("Shop ID is missing from session");
        }
        OpenExpense current = openExpense(id, shopId);
        int updated = jdbcTemplate.update(
                "UPDATE salon_expenses SET is_cancelled = 1 WHERE id = ? AND shop_id = ? AND IFNULL(is_cancelled,0) = 0",
                id,
                shopId
        );
        if (updated == 0) {
            throw new RuntimeException("Expense not found or already cancelled");
        }
        writeLog(id, "cancel", current.amount(), current.amount(), current.expenseFor(), current.expenseFor(), reason, user);
    }

    public SalonExpenseReportData report(String from, String to, String shopId, Long userId, String payMode,
                                         String customerType, AppUser user) {
        String sessionShop = user == null ? "" : user.shopId();
        if (sessionShop != null && !sessionShop.isBlank()) {
            return report(from, to, sessionShop, userId, payMode, customerType);
        }
        return report(from, to, shopId, userId, payMode, customerType);
    }

    public SalonExpenseReportData report(String from, String to, String shopId) {
        return report(from, to, shopId, null, null, null);
    }

    public SalonExpenseReportData report(String from, String to, String shopId, Long userId) {
        return report(from, to, shopId, userId, null, null);
    }

    public SalonExpenseReportData report(String from, String to, String shopId, Long userId, String payMode,
                                         String customerType) {
        if (from == null || from.isBlank() || to == null || to.isBlank()) {
            throw new RuntimeException("From date and to date are required");
        }
        String mode = payMode == null ? "" : payMode.trim().toLowerCase();
        if (!mode.isEmpty() && !PAY_MODES.contains(mode)) {
            throw new RuntimeException("Choose Cash or UPI");
        }
        String type = customerType == null ? "" : customerType.trim().toLowerCase();
        if (!type.isEmpty() && !TYPES.contains(type)) {
            throw new RuntimeException("Choose Cable or WiFi");
        }
        StringBuilder sql = new StringBuilder(
                "SELECT se.id, se.amount, se.expense_for AS expenseFor, " +
                        "IFNULL(se.pay_mode,'cash') AS payMode, IFNULL(se.customer_type,'cable') AS customerType, " +
                        "se.shop_id AS shopId, IFNULL(o.shop_name, se.shop_id) AS shopName, se.uid AS userId, " +
                        "IFNULL(NULLIF(u.fullName,''), u.user_name) AS userName, " +
                        "DATE_FORMAT(se.exp_date, '%d-%m-%Y') AS expenseDate, " +
                        "TIME_FORMAT(se.exp_time, '%h:%i %p') AS expenseTime " +
                        "FROM salon_expenses se " +
                        "LEFT JOIN users u ON u.id = se.uid " +
                        "LEFT JOIN outlets o ON o.shop_id = se.shop_id " +
                        "WHERE se.exp_date BETWEEN ? AND ? AND IFNULL(se.is_cancelled,0) = 0"
        );
        List<Object> args = new ArrayList<>();
        args.add(from);
        args.add(to);
        if (shopId != null && !shopId.isBlank()) {
            sql.append(" AND se.shop_id = ?");
            args.add(shopId);
        }
        if (userId != null && userId > 0) {
            sql.append(" AND se.uid = ?");
            args.add(userId);
        }
        if (!mode.isEmpty()) {
            sql.append(" AND LOWER(IFNULL(se.pay_mode,'cash')) = ?");
            args.add(mode);
        }
        if (!type.isEmpty()) {
            sql.append(" AND LOWER(IFNULL(se.customer_type,'cable')) = ?");
            args.add(type);
        }
        sql.append(" ORDER BY se.exp_date DESC, se.exp_time DESC, se.id DESC");

        List<SalonExpenseRow> rows = jdbcTemplate.query(sql.toString(), (rs, i) -> mapRow(rs), args.toArray());
        SalonExpenseReportData data = new SalonExpenseReportData();
        data.setRows(rows);
        data.setCount(rows.size());
        double total = 0;
        double cash = 0;
        double upi = 0;
        double cable = 0;
        double wifi = 0;
        for (SalonExpenseRow row : rows) {
            double amount = row.getAmount() == null ? 0 : row.getAmount();
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
        data.setGrandTotal(total);
        data.setCashTotal(cash);
        data.setUpiTotal(upi);
        data.setCableTotal(cable);
        data.setWifiTotal(wifi);
        return data;
    }

    private String normalizePayMode(String raw) {
        String mode = raw == null ? "" : raw.trim().toLowerCase();
        if (!PAY_MODES.contains(mode)) {
            throw new RuntimeException("Choose Cash or UPI");
        }
        return mode;
    }

    private String normalizeType(String raw) {
        String type = raw == null ? "" : raw.trim().toLowerCase();
        if (!TYPES.contains(type)) {
            throw new RuntimeException("Choose Cable or WiFi");
        }
        return type;
    }

    private OpenExpense openExpense(Long id, String shopId) {
        List<OpenExpense> rows = jdbcTemplate.query(
                "SELECT amount, expense_for FROM salon_expenses " +
                        "WHERE id = ? AND shop_id = ? AND IFNULL(is_cancelled,0) = 0 LIMIT 1",
                (rs, i) -> new OpenExpense(rs.getDouble("amount"), rs.getString("expense_for")),
                id,
                shopId
        );
        if (rows.isEmpty()) {
            throw new RuntimeException("Expense not found or already cancelled");
        }
        return rows.get(0);
    }

    private void writeLog(Long expenseId, String action, Double oldAmount, Double newAmount,
                          String oldExpenseFor, String newExpenseFor, String reason, AppUser user) {
        jdbcTemplate.update(
                "INSERT INTO salon_expense_logs (expense_id, action, old_amount, new_amount, old_expense_for, " +
                        "new_expense_for, reason, uid, shop_id, log_date, log_time) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), CURTIME())",
                expenseId,
                action,
                oldAmount,
                newAmount,
                oldExpenseFor,
                newExpenseFor,
                reason,
                user == null ? null : user.getId(),
                user == null ? null : user.shopId()
        );
    }

    private SalonExpenseRow mapRow(ResultSet rs) throws SQLException {
        SalonExpenseRow row = new SalonExpenseRow();
        row.setId(rs.getLong("id"));
        row.setAmount(rs.getDouble("amount"));
        row.setExpenseFor(rs.getString("expenseFor"));
        row.setPayMode(rs.getString("payMode"));
        row.setCustomerType(rs.getString("customerType"));
        row.setShopId(rs.getString("shopId"));
        row.setShopName(rs.getString("shopName"));
        long userId = rs.getLong("userId");
        row.setUserId(rs.wasNull() ? null : userId);
        row.setUserName(rs.getString("userName"));
        row.setExpenseDate(rs.getString("expenseDate"));
        row.setExpenseTime(rs.getString("expenseTime"));
        return row;
    }

    private record OpenExpense(double amount, String expenseFor) {
    }
}
