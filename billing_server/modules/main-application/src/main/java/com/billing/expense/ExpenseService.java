package com.billing.expense;

import com.billing.expense.dto.ExpenseReportRow;
import com.billing.expense.dto.ExpenseSaveRequest;
import com.billing.expense.dto.ExpenseTypeData;
import com.billing.expense.dto.ExpenseTypeSaveRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final JdbcTemplate jdbcTemplate;

    public List<ExpenseTypeData> types() {
        return jdbcTemplate.query(
                "SELECT id, type FROM expense_type WHERE is_active = 1 ORDER BY type",
                (rs, i) -> {
                    ExpenseTypeData row = new ExpenseTypeData();
                    row.setId(rs.getLong("id"));
                    row.setName(rs.getString("type"));
                    return row;
                }
        );
    }

    @Transactional
    public void saveType(ExpenseTypeSaveRequest request) {
        String name = required(request == null ? null : request.getName(), "Expense type name is required");
        Long id = request.getId();
        if (typeExists(name, id)) {
            throw new RuntimeException("Expense type already exists!");
        }
        if (id != null && id > 0) {
            int updated = jdbcTemplate.update("UPDATE expense_type SET type = ? WHERE id = ?", name, id);
            if (updated == 0) {
                throw new RuntimeException("Expense type not found");
            }
        } else {
            jdbcTemplate.update("INSERT INTO expense_type(type, is_active) VALUES (?, 1)", name);
        }
    }

    @Transactional
    public void blockType(Long id) {
        if (id == null || id <= 0) {
            throw new RuntimeException("Expense type not found");
        }
        int updated = jdbcTemplate.update("UPDATE expense_type SET is_active = 0 WHERE id = ?", id);
        if (updated == 0) {
            throw new RuntimeException("Expense type not found");
        }
    }

    @Transactional
    public boolean saveEntry(ExpenseSaveRequest request, Long uid) {
        if (request == null || request.getExpenseType() == null || request.getExpenseType() <= 0) {
            throw new RuntimeException("Please select an expense type");
        }
        String content = required(request.getContent(), "Please enter content");
        String description = request.getDescription() == null ? "" : request.getDescription().trim();
        double amount = nz(request.getAmount());
        if (amount <= 0) {
            throw new RuntimeException("Please enter a valid amount.");
        }
        String date = required(request.getExpenseDate(), "Please select a date");
        String time = required(request.getExpenseTime(), "Please select a time");
        if (!time.contains(":")) {
            throw new RuntimeException("Please select a time");
        }
        String dateTime = date + " " + (time.length() == 5 ? time + ":00" : time);

        int payMode = request.getPayMode() == null ? 1 : request.getPayMode();
        int payType = request.getPayType() == null ? 0 : request.getPayType();
        double cashPaid = nz(request.getCashPaid());
        double bankPaid = nz(request.getBankPaid());
        double balance = nz(request.getBalance());
        if (payMode < 1 || payMode > 3) {
            throw new RuntimeException("Invalid pay mode");
        }
        if (payMode == 1) {
            payType = 0;
            bankPaid = 0;
        } else if (payType < 1 || payType > 5) {
            throw new RuntimeException("Please select a pay type");
        }
        if (Math.abs((cashPaid + bankPaid + balance) - amount) > 0.01) {
            throw new RuntimeException("Cash + Bank + Balance must equal the expense amount.");
        }
        if (payMode == 1 && cashPaid <= 0 && balance <= 0) {
            throw new RuntimeException("Please enter cash paid amount.");
        }
        if (payMode == 2 && bankPaid <= 0 && balance <= 0) {
            throw new RuntimeException("Please enter bank paid amount.");
        }

        Integer typeOk = jdbcTemplate.query(
                "SELECT id FROM expense_type WHERE id = ? AND is_active = 1",
                rs -> rs.next() ? 1 : 0,
                request.getExpenseType()
        );
        if (typeOk == null || typeOk == 0) {
            throw new RuntimeException("Please select an expense type");
        }

        KeyHolder keys = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO expense_entry(exp_type, content, description, amount, exc_date_time, entry_date_time, uid, is_active) "
                            + "VALUES (?, ?, ?, ?, ?, NOW(), ?, 1)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setLong(1, request.getExpenseType());
            ps.setString(2, content);
            ps.setString(3, description);
            ps.setDouble(4, amount);
            ps.setString(5, dateTime);
            ps.setLong(6, uid);
            return ps;
        }, keys);
        Number key = keys.getKey();
        if (key == null) {
            throw new RuntimeException("Failed to create expense entry.");
        }
        jdbcTemplate.update(
                "INSERT INTO prod_ledger (bill_type, bill_id, customer_id, supplier_id, payment_mode, bill_amount, cash_paid, bank_paid, payment_type, uid, date_time) "
                        + "VALUES (9, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, NOW())",
                key.longValue(), payMode, amount, cashPaid, bankPaid, payType, uid
        );
        return true;
    }

    public List<ExpenseReportRow> report(String from, String to, Long typeId) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        String sql = "SELECT ee.id, ee.exc_date_time, COALESCE(et.type, 'Unknown') AS type_name, ee.content, ee.description, "
                + "ee.amount, COALESCE(u.user_name, 'Unknown') AS user_name "
                + "FROM expense_entry ee "
                + "LEFT JOIN expense_type et ON ee.exp_type = et.id "
                + "LEFT JOIN users u ON ee.uid = u.id "
                + "WHERE ee.is_active = 1 AND DATE(ee.exc_date_time) BETWEEN ? AND ? ";
        Object[] args;
        if (typeId != null && typeId > 0) {
            sql += "AND ee.exp_type = ? ";
            args = new Object[]{fromDate, toDate, typeId};
        } else {
            args = new Object[]{fromDate, toDate};
        }
        sql += "ORDER BY ee.exc_date_time DESC";
        return jdbcTemplate.query(sql, (rs, i) -> {
            ExpenseReportRow row = new ExpenseReportRow();
            row.setId(rs.getLong("id"));
            row.setDateTime(asStr(rs.getObject("exc_date_time")));
            row.setTypeName(rs.getString("type_name"));
            row.setContent(rs.getString("content"));
            row.setDescription(rs.getString("description"));
            row.setAmount(rs.getDouble("amount"));
            row.setUserName(rs.getString("user_name"));
            return row;
        }, args);
    }

    private boolean typeExists(String name, Long excludeId) {
        List<Long> ids = excludeId != null && excludeId > 0
                ? jdbcTemplate.query("SELECT id FROM expense_type WHERE type = ? AND id != ?", (rs, i) -> rs.getLong(1), name, excludeId)
                : jdbcTemplate.query("SELECT id FROM expense_type WHERE type = ?", (rs, i) -> rs.getLong(1), name);
        return !ids.isEmpty();
    }

    private String required(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new RuntimeException(message);
        }
        return value.trim();
    }

    private double nz(Double value) {
        return value == null ? 0 : value;
    }

    private String asStr(Object value) {
        return value == null ? "" : value.toString();
    }
}
