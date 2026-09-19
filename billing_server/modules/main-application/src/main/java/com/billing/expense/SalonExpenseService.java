package com.billing.expense;

import com.billing.data.AppUser;
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

@Service
@RequiredArgsConstructor
public class SalonExpenseService {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void ensureTable() {
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS salon_expenses (" +
                        "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
                        "amount DECIMAL(12,2) NOT NULL," +
                        "expense_for VARCHAR(255) NOT NULL," +
                        "shop_id VARCHAR(255) DEFAULT NULL," +
                        "uid INT DEFAULT NULL," +
                        "exp_date DATE DEFAULT NULL," +
                        "exp_time TIME DEFAULT NULL," +
                        "PRIMARY KEY (id)" +
                        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
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

        KeyHolder keys = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO salon_expenses (amount, expense_for, shop_id, uid, exp_date, exp_time) " +
                            "VALUES (?, ?, ?, ?, CURDATE(), CURTIME())",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setDouble(1, request.getAmount());
            ps.setString(2, expenseFor);
            ps.setString(3, shopId);
            ps.setLong(4, uid);
            return ps;
        }, keys);
        Number key = keys.getKey();
        return Map.of("id", key == null ? 0 : key.longValue());
    }

    public SalonExpenseReportData report(String from, String to, String shopId, AppUser user) {
        String sessionShop = user == null ? "" : user.shopId();
        if (sessionShop != null && !sessionShop.isBlank()) {
            return report(from, to, sessionShop);
        }
        return report(from, to, shopId);
    }

    public SalonExpenseReportData report(String from, String to, String shopId) {
        if (from == null || from.isBlank() || to == null || to.isBlank()) {
            throw new RuntimeException("From date and to date are required");
        }
        StringBuilder sql = new StringBuilder(
                "SELECT se.id, se.amount, se.expense_for AS expenseFor, se.shop_id AS shopId, " +
                        "IFNULL(o.shop_name, se.shop_id) AS shopName, se.uid AS userId, " +
                        "IFNULL(NULLIF(u.fullName,''), u.user_name) AS userName, " +
                        "DATE_FORMAT(se.exp_date, '%d-%m-%Y') AS expenseDate, " +
                        "TIME_FORMAT(se.exp_time, '%h:%i %p') AS expenseTime " +
                        "FROM salon_expenses se " +
                        "LEFT JOIN users u ON u.id = se.uid " +
                        "LEFT JOIN outlets o ON o.shop_id = se.shop_id " +
                        "WHERE se.exp_date BETWEEN ? AND ?"
        );
        List<Object> args = new ArrayList<>();
        args.add(from);
        args.add(to);
        if (shopId != null && !shopId.isBlank()) {
            sql.append(" AND se.shop_id = ?");
            args.add(shopId);
        }
        sql.append(" ORDER BY se.exp_date DESC, se.exp_time DESC, se.id DESC");

        List<SalonExpenseRow> rows = jdbcTemplate.query(sql.toString(), (rs, i) -> mapRow(rs), args.toArray());
        SalonExpenseReportData data = new SalonExpenseReportData();
        data.setRows(rows);
        data.setCount(rows.size());
        double total = 0;
        for (SalonExpenseRow row : rows) {
            total += row.getAmount() == null ? 0 : row.getAmount();
        }
        data.setGrandTotal(total);
        return data;
    }

    private SalonExpenseRow mapRow(ResultSet rs) throws SQLException {
        SalonExpenseRow row = new SalonExpenseRow();
        row.setId(rs.getLong("id"));
        row.setAmount(rs.getDouble("amount"));
        row.setExpenseFor(rs.getString("expenseFor"));
        row.setShopId(rs.getString("shopId"));
        row.setShopName(rs.getString("shopName"));
        long userId = rs.getLong("userId");
        row.setUserId(rs.wasNull() ? null : userId);
        row.setUserName(rs.getString("userName"));
        row.setExpenseDate(rs.getString("expenseDate"));
        row.setExpenseTime(rs.getString("expenseTime"));
        return row;
    }
}
