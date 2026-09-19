package com.billing.stockreport;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StockReportService {

    private final JdbcTemplate jdbcTemplate;

    public List<Map<String, Object>> products() {
        return jdbcTemplate.query(
                "SELECT id, NAME AS name FROM prod_product WHERE is_active = 1 ORDER BY NAME",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", rs.getLong("id"));
                    row.put("name", rs.getString("name"));
                    return row;
                }
        );
    }

    public List<Map<String, Object>> currentStock() {
        return jdbcTemplate.query(
                "SELECT b.name, b.code, a.stock, a.cost, a.mrp, "
                        + "CASE WHEN disc_type = 1 THEN discount WHEN disc_type = 2 THEN ROUND(mrp * (discount/100), 2) ELSE 0 END AS discount_rs, "
                        + "IFNULL(u.name,'') AS unit_name, b.category_id, IFNULL(c.name,'') AS category_name, IFNULL(u.convertion_unit,'') AS convertion_unit "
                        + "FROM prod_batch a JOIN prod_product b ON b.id = a.product_id "
                        + "LEFT JOIN prod_units u ON u.id = b.unit_id LEFT JOIN prod_category c ON c.id = b.category_id "
                        + "WHERE a.stock > 0 AND IFNULL(b.is_active, 0) = 1 ORDER BY CAST(SUBSTRING(b.code, 2) AS UNSIGNED)",
                (rs, i) -> {
                    double stock = rs.getDouble("stock");
                    double cost = rs.getDouble("cost");
                    double mrp = rs.getDouble("mrp");
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("productName", rs.getString("name"));
                    row.put("code", rs.getString("code"));
                    row.put("stock", stock);
                    row.put("cost", cost);
                    row.put("mrp", mrp);
                    row.put("discount", rs.getDouble("discount_rs"));
                    row.put("totalCost", stock * cost);
                    row.put("totalMrp", stock * mrp);
                    row.put("unit", nz(rs.getString("convertion_unit")).isEmpty() ? nz(rs.getString("unit_name")) : rs.getString("convertion_unit"));
                    row.put("categoryId", rs.getLong("category_id"));
                    row.put("categoryName", nz(rs.getString("category_name")));
                    return row;
                }
        );
    }

    public List<Map<String, Object>> transactions(String from, String to, Long productId) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        String sql = "SELECT b.name, a.stock_in, a.stock_out, a.stock_now, a.notes, "
                + "CONCAT(DATE_FORMAT(a.date, '%d-%m-%Y'),'/',a.time) AS datetime, c.user_name, a.stockAdjType, "
                + "IFNULL(u.name,'') AS unit_name, IFNULL(u.convertion_unit,'') AS convertion_unit "
                + "FROM prod_lifecycle a JOIN prod_product b ON a.product_id = b.id JOIN users c ON c.id = a.uid "
                + "LEFT JOIN prod_units u ON u.id = b.unit_id WHERE a.date BETWEEN ? AND ? ";
        List<Object> args = new ArrayList<>();
        args.add(fromDate);
        args.add(toDate);
        if (productId != null && productId > 0) {
            sql += "AND a.product_id = ? ";
            args.add(productId);
        }
        sql += "ORDER BY a.id";
        return jdbcTemplate.query(sql, (rs, i) -> {
            String unit = nz(rs.getString("convertion_unit")).isEmpty() ? nz(rs.getString("unit_name")) : rs.getString("convertion_unit");
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("productName", rs.getString("name"));
            row.put("stockIn", rs.getDouble("stock_in"));
            row.put("stockOut", rs.getDouble("stock_out"));
            row.put("stockNow", rs.getDouble("stock_now"));
            row.put("notes", nz(rs.getString("notes")));
            row.put("dateTime", nz(rs.getString("datetime")));
            row.put("userName", nz(rs.getString("user_name")));
            row.put("adjType", rs.getInt("stockAdjType"));
            row.put("unit", unit);
            return row;
        }, args.toArray());
    }

    public List<Map<String, Object>> adjustments(String from, String to, Long productId, Integer stockType) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        String sql = "SELECT psa.id, p.name AS product_name, psa.stockType, psa.stock, psa.date, psa.time, psa.notes, "
                + "u.user_name, IFNULL(pu.convertion_unit,'') AS convertion_unit "
                + "FROM prod_stock_adjustment psa JOIN prod_product p ON psa.product_id = p.id "
                + "JOIN users u ON psa.uid = u.id LEFT JOIN prod_units pu ON pu.id = p.unit_id "
                + "WHERE psa.date BETWEEN ? AND ? ";
        List<Object> args = new ArrayList<>();
        args.add(fromDate);
        args.add(toDate);
        if (productId != null && productId > 0) {
            sql += "AND psa.product_id = ? ";
            args.add(productId);
        }
        if (stockType != null && stockType > 0) {
            sql += "AND psa.stockType = ? ";
            args.add(stockType);
        }
        sql += "ORDER BY psa.date DESC, psa.time DESC";
        return jdbcTemplate.query(sql, (rs, i) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", rs.getLong("id"));
            row.put("productName", rs.getString("product_name"));
            row.put("stockType", rs.getInt("stockType"));
            row.put("stock", rs.getDouble("stock"));
            row.put("date", asStr(rs.getObject("date")));
            row.put("time", asStr(rs.getObject("time")));
            row.put("notes", nz(rs.getString("notes")));
            row.put("userName", nz(rs.getString("user_name")));
            row.put("unit", nz(rs.getString("convertion_unit")));
            return row;
        }, args.toArray());
    }

    private String required(String value, String message) {
        if (value == null || value.trim().isEmpty()) throw new RuntimeException(message);
        return value.trim();
    }

    private String nz(String value) {
        return value == null ? "" : value;
    }

    private String asStr(Object value) {
        return value == null ? "" : value.toString();
    }
}
