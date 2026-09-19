package com.billing.customer;

import com.billing.customer.dto.CableCustomerDisconnectRequest;
import com.billing.customer.dto.CableCustomerReconnectRequest;
import com.billing.customer.dto.CableCustomerRow;
import com.billing.customer.dto.CableCustomerSaveRequest;
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
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CableCustomerService {

    private static final Set<String> TYPES = Set.of("cable", "wifi");

    private static final String SELECT_ROWS =
            "SELECT c.id, c.customer_type AS customerType, c.customer_id AS customerId, " +
                    "c.name, IFNULL(c.mobile,'') AS mobile, IFNULL(c.address,'') AS address, " +
                    "IFNULL(c.area,'') AS area, IFNULL(c.notes,'') AS notes, " +
                    "IFNULL(c.monthly_amount, 0) AS monthlyAmount, " +
                    "IFNULL(c.is_active, 1) AS isActive, " +
                    "c.uid, c.shop_id AS shopId, " +
                    "IFNULL(NULLIF(u.fullName,''), u.user_name) AS createdBy, " +
                    "DATE_FORMAT(c.joining_date, '%d-%m-%Y') AS joiningDate, " +
                    "DATE_FORMAT(c.joining_date, '%Y-%m-%d') AS joiningDateIso, " +
                    "DATE_FORMAT(c.disconnect_date, '%d-%m-%Y') AS disconnectDate, " +
                    "DATE_FORMAT(c.disconnect_date, '%Y-%m-%d') AS disconnectDateIso, " +
                    "IFNULL(c.disconnect_notes,'') AS disconnectNotes, " +
                    "DATE_FORMAT(c.reconnect_date, '%d-%m-%Y') AS reconnectDate, " +
                    "DATE_FORMAT(c.reconnect_date, '%Y-%m-%d') AS reconnectDateIso, " +
                    "IFNULL(c.reconnect_notes,'') AS reconnectNotes " +
                    "FROM cable_customers c " +
                    "LEFT JOIN users u ON u.id = c.uid";

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void ensureTable() {
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS cable_customers (" +
                        "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
                        "customer_type VARCHAR(10) NOT NULL," +
                        "customer_id VARCHAR(50) NOT NULL," +
                        "name VARCHAR(255) NOT NULL," +
                        "mobile VARCHAR(20) DEFAULT NULL," +
                        "address TEXT," +
                        "area VARCHAR(255) DEFAULT NULL," +
                        "joining_date DATE DEFAULT NULL," +
                        "notes TEXT," +
                        "monthly_amount DECIMAL(12,2) NOT NULL DEFAULT 0," +
                        "is_active TINYINT NOT NULL DEFAULT 1," +
                        "uid INT DEFAULT NULL," +
                        "shop_id VARCHAR(255) DEFAULT NULL," +
                        "created_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
                        "PRIMARY KEY (id)," +
                        "UNIQUE KEY uk_cable_customer_shop (shop_id, customer_id)" +
                        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
        ensureColumn("is_active", "TINYINT NOT NULL DEFAULT 1 AFTER notes");
        ensureColumn("monthly_amount", "DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER notes");
        ensureColumn("disconnect_date", "DATE DEFAULT NULL AFTER is_active");
        ensureColumn("disconnect_notes", "TEXT AFTER disconnect_date");
        ensureColumn("reconnect_date", "DATE DEFAULT NULL AFTER disconnect_notes");
        ensureColumn("reconnect_notes", "TEXT AFTER reconnect_date");
    }

    private void ensureColumn(String column, String definition) {
        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS " +
                        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_customers' AND COLUMN_NAME = ?",
                Integer.class,
                column
        );
        if (exists == null || exists == 0) {
            jdbcTemplate.execute("ALTER TABLE cable_customers ADD COLUMN " + column + " " + definition);
        }
    }

    public List<CableCustomerRow> list(AppUser user, String customerType, boolean activeOnly) {
        requireUser(user);
        String shopId = user.shopId();
        String sql = SELECT_ROWS + " WHERE c.shop_id = ?";
        if (activeOnly) {
            sql += " AND IFNULL(c.is_active, 1) = 1";
        }
        if (customerType != null && !customerType.isBlank()) {
            String type = typeOf(customerType);
            return jdbcTemplate.query(sql + " AND c.customer_type = ? ORDER BY c.name, c.id", this::mapRow, shopId, type);
        }
        return jdbcTemplate.query(sql + " ORDER BY c.name, c.id", this::mapRow, shopId);
    }

    public List<CableCustomerRow> connections(AppUser user, String from, String to, String customerType) {
        return listByDate(user, from, to, customerType, false);
    }

    public List<CableCustomerRow> disconnections(AppUser user, String from, String to, String customerType) {
        return listByDate(user, from, to, customerType, true);
    }

    private List<CableCustomerRow> listByDate(AppUser user, String from, String to, String customerType,
                                             boolean disconnected) {
        requireUser(user);
        Date fromDate = parseDate(from, "From date");
        Date toDate = parseDate(to, "To date");
        if (toDate.toLocalDate().isBefore(fromDate.toLocalDate())) {
            throw new RuntimeException("To date cannot be before from date");
        }
        String column = disconnected ? "c.disconnect_date" : "c.joining_date";
        String sql = SELECT_ROWS + " WHERE c.shop_id = ? AND " + column + " BETWEEN ? AND ?";
        List<Object> args = new ArrayList<>();
        args.add(user.shopId());
        args.add(fromDate);
        args.add(toDate);
        if (disconnected) {
            sql += " AND IFNULL(c.is_active, 1) = 0";
        }
        if (customerType != null && !customerType.isBlank()) {
            sql += " AND c.customer_type = ?";
            args.add(typeOf(customerType));
        }
        return jdbcTemplate.query(sql + " ORDER BY " + column + " DESC, c.name, c.id", this::mapRow, args.toArray());
    }

    private CableCustomerRow findById(AppUser user, Long id) {
        List<CableCustomerRow> rows = jdbcTemplate.query(
                SELECT_ROWS + " WHERE c.id = ? AND c.shop_id = ? LIMIT 1",
                this::mapRow,
                id,
                user.shopId()
        );
        if (rows.isEmpty()) {
            throw new RuntimeException("Customer not found");
        }
        return rows.get(0);
    }

    public CableCustomerRow findActiveByCustomerId(AppUser user, String customerId) {
        requireUser(user);
        String id = text(customerId);
        if (id.isEmpty()) {
            throw new RuntimeException("Customer ID is required");
        }
        List<CableCustomerRow> rows = jdbcTemplate.query(
                SELECT_ROWS + " WHERE c.shop_id = ? AND LOWER(c.customer_id) = LOWER(?) AND IFNULL(c.is_active, 1) = 1 LIMIT 1",
                this::mapRow,
                user.shopId(),
                id
        );
        if (rows.isEmpty()) {
            throw new RuntimeException("Active customer not found");
        }
        return rows.get(0);
    }

    @Transactional
    public Map<String, Object> save(CableCustomerSaveRequest request, AppUser user) {
        requireUser(user);
        String shopId = user.shopId();
        if (shopId == null || shopId.isBlank()) {
            throw new RuntimeException("Shop ID is missing from session");
        }
        String type = typeOf(request == null ? null : request.getCustomerType());
        String customerId = text(request == null ? null : request.getCustomerId());
        String name = text(request == null ? null : request.getName());
        if (customerId.isEmpty()) {
            throw new RuntimeException("Customer ID is required");
        }
        if (name.isEmpty()) {
            throw new RuntimeException("Customer name is required");
        }
        String mobile = text(request == null ? null : request.getMobile());
        String address = text(request == null ? null : request.getAddress());
        String area = text(request == null ? null : request.getArea());
        String notes = text(request == null ? null : request.getNotes());
        double monthlyAmount = request == null || request.getMonthlyAmount() == null ? 0 : request.getMonthlyAmount();
        if (monthlyAmount <= 0) {
            throw new RuntimeException("Monthly collection amount is required");
        }
        Date joiningDate = parseDate(request == null ? null : request.getJoiningDate());
        Long id = request == null ? null : request.getId();
        Long uid = user.getId();

        if (id != null && id > 0) {
            Integer exists = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM cable_customers WHERE id = ? AND shop_id = ?",
                    Integer.class,
                    id,
                    shopId
            );
            if (exists == null || exists == 0) {
                throw new RuntimeException("Customer not found");
            }
            assertUnique(shopId, customerId, id);
            jdbcTemplate.update(
                    "UPDATE cable_customers SET customer_type = ?, customer_id = ?, name = ?, mobile = ?, " +
                            "address = ?, area = ?, joining_date = ?, notes = ?, monthly_amount = ? WHERE id = ? AND shop_id = ?",
                    type, customerId, name, mobile, address, area, joiningDate, notes, monthlyAmount, id, shopId
            );
            return Map.of("id", id, "customerId", customerId);
        }

        assertUnique(shopId, customerId, 0L);
        KeyHolder keys = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO cable_customers (customer_type, customer_id, name, mobile, address, area, " +
                            "joining_date, notes, monthly_amount, is_active, uid, shop_id) VALUES (?,?,?,?,?,?,?,?,?,1,?,?)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, type);
            ps.setString(2, customerId);
            ps.setString(3, name);
            ps.setString(4, mobile);
            ps.setString(5, address);
            ps.setString(6, area);
            ps.setDate(7, joiningDate);
            ps.setString(8, notes);
            ps.setDouble(9, monthlyAmount);
            if (uid == null) {
                ps.setObject(10, null);
            } else {
                ps.setLong(10, uid);
            }
            ps.setString(11, shopId);
            return ps;
        }, keys);
        Number generated = keys.getKey();
        return Map.of("id", generated == null ? 0 : generated.longValue(), "customerId", customerId);
    }

    @Transactional
    public void disconnect(Long id, CableCustomerDisconnectRequest request, AppUser user) {
        requireUser(user);
        if (id == null || id <= 0) {
            throw new RuntimeException("Customer not found");
        }
        Date disconnectDate = parseDate(request == null ? null : request.getDisconnectDate(), "Disconnect date");
        String notes = text(request == null ? null : request.getNotes());
        if (notes.isEmpty()) {
            throw new RuntimeException("Disconnect notes are required");
        }
        CableCustomerRow customer = findById(user, id);
        if (customer.getIsActive() != null && customer.getIsActive() == 0) {
            throw new RuntimeException("Customer is already disconnected");
        }
        if (customer.getJoiningDateIso() != null && !customer.getJoiningDateIso().isBlank()) {
            LocalDate joined = LocalDate.parse(customer.getJoiningDateIso());
            if (disconnectDate.toLocalDate().isBefore(joined)) {
                throw new RuntimeException("Disconnect date cannot be before joining date");
            }
        }
        int updated = jdbcTemplate.update(
                "UPDATE cable_customers SET is_active = 0, disconnect_date = ?, disconnect_notes = ?, " +
                        "reconnect_date = NULL, reconnect_notes = NULL WHERE id = ? AND shop_id = ?",
                disconnectDate,
                notes,
                id,
                user.shopId()
        );
        if (updated == 0) {
            throw new RuntimeException("Customer not found");
        }
    }

    @Transactional
    public void reconnect(Long id, CableCustomerReconnectRequest request, AppUser user) {
        requireUser(user);
        if (id == null || id <= 0) {
            throw new RuntimeException("Customer not found");
        }
        Date reconnectDate = parseDate(request == null ? null : request.getReconnectDate(), "Reconnect date");
        String notes = text(request == null ? null : request.getNotes());
        if (notes.isEmpty()) {
            throw new RuntimeException("Reconnect notes are required");
        }
        CableCustomerRow customer = findById(user, id);
        if (customer.getIsActive() != null && customer.getIsActive() == 1) {
            throw new RuntimeException("Customer is already connected");
        }
        if (customer.getDisconnectDateIso() != null && !customer.getDisconnectDateIso().isBlank()) {
            LocalDate disconnected = LocalDate.parse(customer.getDisconnectDateIso());
            if (reconnectDate.toLocalDate().isBefore(disconnected)) {
                throw new RuntimeException("Reconnect date cannot be before disconnect date");
            }
        }
        int updated = jdbcTemplate.update(
                "UPDATE cable_customers SET is_active = 1, reconnect_date = ?, reconnect_notes = ? " +
                        "WHERE id = ? AND shop_id = ?",
                reconnectDate,
                notes,
                id,
                user.shopId()
        );
        if (updated == 0) {
            throw new RuntimeException("Customer not found");
        }
    }

    @Transactional
    public void setActive(Long id, boolean active, AppUser user) {
        requireUser(user);
        if (id == null || id <= 0) {
            throw new RuntimeException("Customer not found");
        }
        int updated = jdbcTemplate.update(
                "UPDATE cable_customers SET is_active = ? WHERE id = ? AND shop_id = ?",
                active ? 1 : 0,
                id,
                user.shopId()
        );
        if (updated == 0) {
            throw new RuntimeException("Customer not found");
        }
    }

    private void assertUnique(String shopId, String customerId, Long exceptId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM cable_customers WHERE shop_id = ? AND customer_id = ? AND id <> ?",
                Integer.class,
                shopId,
                customerId,
                exceptId == null ? 0L : exceptId
        );
        if (count != null && count > 0) {
            throw new RuntimeException("Customer ID already exists");
        }
    }

    private String typeOf(String raw) {
        String type = raw == null ? "" : raw.trim().toLowerCase();
        if (!TYPES.contains(type)) {
            throw new RuntimeException("Choose Cable or WiFi");
        }
        return type;
    }

    private Date parseDate(String raw) {
        return parseDate(raw == null || raw.isBlank() ? LocalDate.now().toString() : raw, "Joining date");
    }

    private Date parseDate(String raw, String label) {
        if (raw == null || raw.isBlank()) {
            throw new RuntimeException(label + " is required");
        }
        try {
            return Date.valueOf(LocalDate.parse(raw.trim()));
        } catch (DateTimeParseException ex) {
            throw new RuntimeException(label + " is invalid");
        }
    }

    private String text(String raw) {
        return raw == null ? "" : raw.trim();
    }

    private void requireUser(AppUser user) {
        if (user == null || user.getId() == null) {
            throw new RuntimeException("Please login again");
        }
    }

    private CableCustomerRow mapRow(ResultSet rs, int i) throws SQLException {
        CableCustomerRow row = new CableCustomerRow();
        row.setId(rs.getLong("id"));
        row.setCustomerType(rs.getString("customerType"));
        row.setCustomerId(rs.getString("customerId"));
        row.setName(rs.getString("name"));
        row.setMobile(rs.getString("mobile"));
        row.setAddress(rs.getString("address"));
        row.setArea(rs.getString("area"));
        row.setNotes(rs.getString("notes"));
        row.setMonthlyAmount(rs.getDouble("monthlyAmount"));
        row.setIsActive(rs.getInt("isActive"));
        long uid = rs.getLong("uid");
        row.setUid(rs.wasNull() ? null : uid);
        row.setShopId(rs.getString("shopId"));
        row.setCreatedBy(rs.getString("createdBy"));
        row.setJoiningDate(rs.getString("joiningDate"));
        row.setJoiningDateIso(rs.getString("joiningDateIso"));
        row.setDisconnectDate(rs.getString("disconnectDate"));
        row.setDisconnectDateIso(rs.getString("disconnectDateIso"));
        row.setDisconnectNotes(rs.getString("disconnectNotes"));
        row.setReconnectDate(rs.getString("reconnectDate"));
        row.setReconnectDateIso(rs.getString("reconnectDateIso"));
        row.setReconnectNotes(rs.getString("reconnectNotes"));
        return row;
    }
}
