package com.billing.stock;

import com.billing.data.AppUser;
import com.billing.stock.dto.StockMoveRequest;
import com.billing.stock.dto.StockProductRow;
import com.billing.stock.dto.StockProductSaveRequest;
import com.billing.stock.dto.StockSaleCancelRequest;
import com.billing.stock.dto.StockSaleLogRow;
import com.billing.stock.dto.StockSaleReportData;
import com.billing.stock.dto.StockSaleRow;
import com.billing.stock.dto.StockSaleUpdateRequest;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StockService {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void ensureTables() {
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS stock_products (" +
                        "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
                        "name VARCHAR(150) NOT NULL," +
                        "rate DECIMAL(12,2) NOT NULL DEFAULT 0," +
                        "notes TEXT," +
                        "qty DECIMAL(12,3) NOT NULL DEFAULT 0," +
                        "uid INT DEFAULT NULL," +
                        "shop_id VARCHAR(255) DEFAULT NULL," +
                        "PRIMARY KEY (id)," +
                        "KEY idx_stock_product_shop (shop_id, name)" +
                        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS stock_ins (" +
                        "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
                        "product_id INT NOT NULL," +
                        "qty DECIMAL(12,3) NOT NULL," +
                        "rate DECIMAL(12,2) NOT NULL," +
                        "notes TEXT," +
                        "entry_date DATE NOT NULL," +
                        "entry_time TIME NOT NULL," +
                        "uid INT DEFAULT NULL," +
                        "shop_id VARCHAR(255) DEFAULT NULL," +
                        "PRIMARY KEY (id)," +
                        "KEY idx_stock_in_shop (shop_id, entry_date)" +
                        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS stock_sales (" +
                        "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
                        "product_id INT NOT NULL," +
                        "qty DECIMAL(12,3) NOT NULL," +
                        "rate DECIMAL(12,2) NOT NULL," +
                        "amount DECIMAL(12,2) NOT NULL," +
                        "notes TEXT," +
                        "sale_date DATE NOT NULL," +
                        "sale_time TIME NOT NULL," +
                        "uid INT DEFAULT NULL," +
                        "shop_id VARCHAR(255) DEFAULT NULL," +
                        "is_cancelled TINYINT NOT NULL DEFAULT 0," +
                        "PRIMARY KEY (id)," +
                        "KEY idx_stock_sale_shop (shop_id, sale_date)" +
                        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS stock_sale_logs (" +
                        "id INT UNSIGNED NOT NULL AUTO_INCREMENT," +
                        "sale_id INT NOT NULL," +
                        "action VARCHAR(20) NOT NULL," +
                        "product_id INT DEFAULT NULL," +
                        "old_qty DECIMAL(12,3) DEFAULT NULL," +
                        "new_qty DECIMAL(12,3) DEFAULT NULL," +
                        "old_rate DECIMAL(12,2) DEFAULT NULL," +
                        "new_rate DECIMAL(12,2) DEFAULT NULL," +
                        "old_amount DECIMAL(12,2) DEFAULT NULL," +
                        "new_amount DECIMAL(12,2) DEFAULT NULL," +
                        "reason TEXT," +
                        "uid INT DEFAULT NULL," +
                        "shop_id VARCHAR(255) DEFAULT NULL," +
                        "log_date DATE DEFAULT NULL," +
                        "log_time TIME DEFAULT NULL," +
                        "PRIMARY KEY (id)," +
                        "KEY idx_stock_sale_log (shop_id, log_date)" +
                        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
    }

    public List<StockProductRow> products(AppUser user) {
        String shopId = requireShop(user);
        return jdbcTemplate.query(
                "SELECT id, name, rate, notes, qty FROM stock_products WHERE shop_id = ? ORDER BY name, id",
                (rs, i) -> mapProduct(rs.getLong("id"), rs.getString("name"), rs.getDouble("rate"),
                        rs.getString("notes"), rs.getDouble("qty")),
                shopId
        );
    }

    @Transactional
    public void saveProduct(StockProductSaveRequest request, AppUser user) {
        String shopId = requireShop(user);
        String name = request == null || request.getName() == null ? "" : request.getName().trim();
        if (name.isEmpty()) {
            throw new RuntimeException("Product name is required");
        }
        double rate = request.getRate() == null ? 0 : request.getRate();
        if (rate < 0) {
            throw new RuntimeException("Enter a valid rate");
        }
        String notes = request.getNotes() == null ? "" : request.getNotes().trim();
        if (request.getId() != null && request.getId() > 0) {
            int updated = jdbcTemplate.update(
                    "UPDATE stock_products SET name = ?, rate = ?, notes = ? WHERE id = ? AND shop_id = ?",
                    name, round2(rate), notes, request.getId(), shopId
            );
            if (updated == 0) {
                throw new RuntimeException("Product not found");
            }
            return;
        }
        jdbcTemplate.update(
                "INSERT INTO stock_products (name, rate, notes, qty, uid, shop_id) VALUES (?,?,?,0,?,?)",
                name, round2(rate), notes, user.getId(), shopId
        );
    }

    @Transactional
    public void addStock(StockMoveRequest request, AppUser user) {
        String shopId = requireShop(user);
        StockProductRow product = product(request == null ? null : request.getProductId(), shopId);
        double qty = request.getQty() == null ? 0 : request.getQty();
        if (qty <= 0) {
            throw new RuntimeException("Enter a valid quantity");
        }
        double rate = request.getRate() == null ? nz(product.getRate()) : request.getRate();
        if (rate < 0) {
            throw new RuntimeException("Enter a valid price");
        }
        String notes = request.getNotes() == null ? "" : request.getNotes().trim();
        jdbcTemplate.update(
                "INSERT INTO stock_ins (product_id, qty, rate, notes, entry_date, entry_time, uid, shop_id) " +
                        "VALUES (?,?,?,?,CURDATE(),CURTIME(),?,?)",
                product.getId(), round3(qty), round2(rate), notes, user.getId(), shopId
        );
        jdbcTemplate.update(
                "UPDATE stock_products SET qty = qty + ?, rate = ? WHERE id = ? AND shop_id = ?",
                round3(qty), round2(rate), product.getId(), shopId
        );
    }

    @Transactional
    public void saveSale(StockMoveRequest request, AppUser user) {
        String shopId = requireShop(user);
        StockProductRow product = product(request == null ? null : request.getProductId(), shopId);
        double qty = request.getQty() == null ? 0 : request.getQty();
        if (qty <= 0) {
            throw new RuntimeException("Enter a valid quantity");
        }
        if (nz(product.getQty()) + 0.0005 < qty) {
            throw new RuntimeException("Not enough stock. Available " + round3(nz(product.getQty())));
        }
        double rate = request.getRate() == null ? nz(product.getRate()) : request.getRate();
        if (rate < 0) {
            throw new RuntimeException("Enter a valid rate");
        }
        String notes = request.getNotes() == null ? "" : request.getNotes().trim();
        jdbcTemplate.update(
                "INSERT INTO stock_sales (product_id, qty, rate, amount, notes, sale_date, sale_time, uid, shop_id) " +
                        "VALUES (?,?,?,?,?,CURDATE(),CURTIME(),?,?)",
                product.getId(), round3(qty), round2(rate), round2(qty * rate), notes, user.getId(), shopId
        );
        jdbcTemplate.update(
                "UPDATE stock_products SET qty = qty - ? WHERE id = ? AND shop_id = ?",
                round3(qty), product.getId(), shopId
        );
    }

    public StockSaleReportData saleReport(String from, String to, AppUser user) {
        String shopId = requireShop(user);
        LocalDate fromDate = parseDate(from, "From date");
        LocalDate toDate = parseDate(to, "To date");
        if (toDate.isBefore(fromDate)) {
            throw new RuntimeException("To date cannot be before from date");
        }
        List<StockSaleRow> rows = saleRows(shopId, fromDate, toDate);
        StockSaleReportData data = new StockSaleReportData();
        data.setRows(rows);
        data.setCount(rows.size());
        data.setTotalQty(round3(rows.stream().mapToDouble(r -> nz(r.getQty())).sum()));
        data.setTotalAmount(round2(rows.stream().mapToDouble(r -> nz(r.getAmount())).sum()));
        return data;
    }

    @Transactional
    public void updateSale(Long id, StockSaleUpdateRequest request, AppUser user) {
        String shopId = requireShop(user);
        String reason = request == null || request.getReason() == null ? "" : request.getReason().trim();
        if (reason.isEmpty()) {
            throw new RuntimeException("Reason is required");
        }
        double qty = request.getQty() == null ? 0 : request.getQty();
        double rate = request.getRate() == null ? 0 : request.getRate();
        if (qty <= 0) {
            throw new RuntimeException("Enter a valid quantity");
        }
        if (rate < 0) {
            throw new RuntimeException("Enter a valid rate");
        }
        OpenSale current = openSale(id, shopId);
        double extra = qty - current.qty();
        if (extra > 0.0005) {
            StockProductRow product = product(current.productId(), shopId);
            if (nz(product.getQty()) + 0.0005 < extra) {
                throw new RuntimeException("Not enough stock. Available " + round3(nz(product.getQty())));
            }
        }
        String notes = request.getNotes() == null ? current.notes() : request.getNotes().trim();
        double amount = round2(qty * rate);
        jdbcTemplate.update(
                "UPDATE stock_sales SET qty = ?, rate = ?, amount = ?, notes = ? " +
                        "WHERE id = ? AND shop_id = ? AND IFNULL(is_cancelled,0) = 0",
                round3(qty), round2(rate), amount, notes, id, shopId
        );
        jdbcTemplate.update(
                "UPDATE stock_products SET qty = qty - ? WHERE id = ? AND shop_id = ?",
                round3(extra), current.productId(), shopId
        );
        writeLog(id, "edit", current.productId(), current.qty(), qty, current.rate(), rate, current.amount(), amount, reason, user);
    }

    @Transactional
    public void cancelSale(Long id, StockSaleCancelRequest request, AppUser user) {
        String shopId = requireShop(user);
        String reason = request == null || request.getReason() == null ? "" : request.getReason().trim();
        if (reason.isEmpty()) {
            throw new RuntimeException("Cancel reason is required");
        }
        OpenSale current = openSale(id, shopId);
        int updated = jdbcTemplate.update(
                "UPDATE stock_sales SET is_cancelled = 1 WHERE id = ? AND shop_id = ? AND IFNULL(is_cancelled,0) = 0",
                id, shopId
        );
        if (updated == 0) {
            throw new RuntimeException("Sale not found or already cancelled");
        }
        jdbcTemplate.update(
                "UPDATE stock_products SET qty = qty + ? WHERE id = ? AND shop_id = ?",
                current.qty(), current.productId(), shopId
        );
        writeLog(id, "cancel", current.productId(), current.qty(), current.qty(), current.rate(), current.rate(),
                current.amount(), current.amount(), reason, user);
    }

    public List<StockSaleLogRow> saleLog(String from, String to, AppUser user) {
        String shopId = requireShop(user);
        LocalDate fromDate = parseDate(from, "From date");
        LocalDate toDate = parseDate(to, "To date");
        if (toDate.isBefore(fromDate)) {
            throw new RuntimeException("To date cannot be before from date");
        }
        return jdbcTemplate.query(
                "SELECT l.id, l.sale_id, l.action, IFNULL(p.name,'') AS productName, " +
                        "l.old_qty, l.new_qty, l.old_rate, l.new_rate, l.old_amount, l.new_amount, " +
                        "IFNULL(l.reason,'') AS reason, " +
                        "IFNULL(NULLIF(u.fullName,''), u.user_name) AS userName, " +
                        "DATE_FORMAT(l.log_date, '%d-%m-%Y') AS logDate, " +
                        "TIME_FORMAT(l.log_time, '%h:%i %p') AS logTime " +
                        "FROM stock_sale_logs l " +
                        "LEFT JOIN stock_products p ON p.id = l.product_id " +
                        "LEFT JOIN users u ON u.id = l.uid " +
                        "WHERE l.shop_id = ? AND l.log_date BETWEEN ? AND ? " +
                        "ORDER BY l.log_date DESC, l.id DESC",
                (rs, i) -> {
                    StockSaleLogRow row = new StockSaleLogRow();
                    row.setId(rs.getLong("id"));
                    row.setSaleId(rs.getLong("sale_id"));
                    row.setAction(rs.getString("action"));
                    row.setProductName(rs.getString("productName"));
                    row.setOldQty(round3(rs.getDouble("old_qty")));
                    row.setNewQty(round3(rs.getDouble("new_qty")));
                    row.setOldRate(round2(rs.getDouble("old_rate")));
                    row.setNewRate(round2(rs.getDouble("new_rate")));
                    row.setOldAmount(round2(rs.getDouble("old_amount")));
                    row.setNewAmount(round2(rs.getDouble("new_amount")));
                    row.setReason(rs.getString("reason"));
                    row.setUserName(rs.getString("userName"));
                    row.setLogDate(rs.getString("logDate"));
                    row.setLogTime(rs.getString("logTime"));
                    return row;
                },
                shopId,
                Date.valueOf(fromDate),
                Date.valueOf(toDate)
        );
    }

    private List<StockSaleRow> saleRows(String shopId, LocalDate fromDate, LocalDate toDate) {
        return jdbcTemplate.query(
                "SELECT s.id, s.product_id, IFNULL(p.name,'') AS productName, s.qty, s.rate, s.amount, s.notes, " +
                        "DATE_FORMAT(s.sale_date, '%d-%m-%Y') AS saleDate, " +
                        "TIME_FORMAT(s.sale_time, '%h:%i %p') AS saleTime, " +
                        "IFNULL(NULLIF(u.fullName,''), u.user_name) AS soldBy " +
                        "FROM stock_sales s " +
                        "LEFT JOIN stock_products p ON p.id = s.product_id " +
                        "LEFT JOIN users u ON u.id = s.uid " +
                        "WHERE s.shop_id = ? AND IFNULL(s.is_cancelled,0) = 0 AND s.sale_date BETWEEN ? AND ? " +
                        "ORDER BY s.sale_date DESC, s.id DESC",
                (rs, i) -> {
                    StockSaleRow row = new StockSaleRow();
                    row.setId(rs.getLong("id"));
                    row.setProductId(rs.getLong("product_id"));
                    row.setProductName(rs.getString("productName"));
                    row.setQty(round3(rs.getDouble("qty")));
                    row.setRate(round2(rs.getDouble("rate")));
                    row.setAmount(round2(rs.getDouble("amount")));
                    row.setNotes(rs.getString("notes"));
                    row.setSaleDate(rs.getString("saleDate"));
                    row.setSaleTime(rs.getString("saleTime"));
                    row.setSoldBy(rs.getString("soldBy"));
                    return row;
                },
                shopId,
                Date.valueOf(fromDate),
                Date.valueOf(toDate)
        );
    }

    private record OpenSale(Long productId, double qty, double rate, double amount, String notes) {
    }

    private OpenSale openSale(Long id, String shopId) {
        List<OpenSale> rows = jdbcTemplate.query(
                "SELECT product_id, qty, rate, amount, notes FROM stock_sales " +
                        "WHERE id = ? AND shop_id = ? AND IFNULL(is_cancelled,0) = 0 LIMIT 1",
                (rs, i) -> new OpenSale(
                        rs.getLong("product_id"),
                        rs.getDouble("qty"),
                        rs.getDouble("rate"),
                        rs.getDouble("amount"),
                        rs.getString("notes")
                ),
                id,
                shopId
        );
        if (rows.isEmpty()) {
            throw new RuntimeException("Sale not found or already cancelled");
        }
        return rows.get(0);
    }

    private void writeLog(Long saleId, String action, Long productId, Double oldQty, Double newQty,
                          Double oldRate, Double newRate, Double oldAmount, Double newAmount,
                          String reason, AppUser user) {
        jdbcTemplate.update(
                "INSERT INTO stock_sale_logs (sale_id, action, product_id, old_qty, new_qty, old_rate, new_rate, " +
                        "old_amount, new_amount, reason, uid, shop_id, log_date, log_time) " +
                        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,CURDATE(),CURTIME())",
                saleId, action, productId, oldQty, newQty, oldRate, newRate, oldAmount, newAmount,
                reason, user.getId(), user.shopId()
        );
    }

    private StockProductRow product(Long id, String shopId) {
        if (id == null || id <= 0) {
            throw new RuntimeException("Select a product");
        }
        List<StockProductRow> rows = jdbcTemplate.query(
                "SELECT id, name, rate, notes, qty FROM stock_products WHERE id = ? AND shop_id = ?",
                (rs, i) -> mapProduct(rs.getLong("id"), rs.getString("name"), rs.getDouble("rate"),
                        rs.getString("notes"), rs.getDouble("qty")),
                id, shopId
        );
        if (rows.isEmpty()) {
            throw new RuntimeException("Product not found");
        }
        return rows.get(0);
    }

    private StockProductRow mapProduct(Long id, String name, double rate, String notes, double qty) {
        StockProductRow row = new StockProductRow();
        row.setId(id);
        row.setName(name);
        row.setRate(round2(rate));
        row.setNotes(notes);
        row.setQty(round3(qty));
        return row;
    }

    private String requireShop(AppUser user) {
        if (user == null || user.getId() == null) {
            throw new RuntimeException("Please login again");
        }
        if (user.shopId() == null || user.shopId().isBlank()) {
            throw new RuntimeException("Shop ID is missing from session");
        }
        return user.shopId();
    }

    private LocalDate parseDate(String raw, String label) {
        if (raw == null || raw.isBlank()) {
            throw new RuntimeException(label + " is required");
        }
        try {
            return LocalDate.parse(raw.trim());
        } catch (DateTimeParseException ex) {
            throw new RuntimeException("Invalid " + label.toLowerCase());
        }
    }

    private double nz(Double value) {
        return value == null ? 0 : value;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private double round3(double value) {
        return Math.round(value * 1000.0) / 1000.0;
    }
}