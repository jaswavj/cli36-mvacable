package com.billing.orderlist;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OrderListService {

    private final JdbcTemplate jdbcTemplate;

    public List<Map<String, Object>> list(String type) {
        String filter = switch (type == null ? "pending" : type.trim().toLowerCase()) {
            case "delivered" -> "po.is_delivered = 1 AND po.is_billed = 0 AND po.is_cancelled = 0";
            case "billed" -> "po.is_billed = 1";
            default -> "po.is_delivered = 0 AND po.is_billed = 0 AND po.is_cancelled = 0";
        };
        return jdbcTemplate.query(
                "SELECT po.id, po.order_no, po.table_id, ot.name AS table_name, po.date, po.time, "
                        + "po.is_delivered, po.is_billed, po.is_cancelled "
                        + "FROM prod_order po JOIN order_tables ot ON po.table_id = ot.id "
                        + "WHERE " + filter + " ORDER BY po.date DESC, po.time DESC",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", rs.getLong("id"));
                    row.put("orderNo", nz(rs.getString("order_no")));
                    row.put("tableId", rs.getLong("table_id"));
                    row.put("tableName", nz(rs.getString("table_name")));
                    row.put("date", asStr(rs.getObject("date")));
                    row.put("time", asStr(rs.getObject("time")));
                    row.put("isDelivered", rs.getInt("is_delivered"));
                    row.put("isBilled", rs.getInt("is_billed"));
                    row.put("isCancelled", rs.getInt("is_cancelled"));
                    return row;
                }
        );
    }

    public Map<String, Object> detail(Long orderId) {
        if (orderId == null || orderId <= 0) {
            throw new RuntimeException("Order not found");
        }
        List<Map<String, Object>> headers = jdbcTemplate.query(
                "SELECT po.id, po.order_no, po.table_id, ot.name AS table_name, po.date, po.time, "
                        + "po.is_delivered, po.is_billed, po.is_cancelled "
                        + "FROM prod_order po JOIN order_tables ot ON po.table_id = ot.id WHERE po.id = ?",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", rs.getLong("id"));
                    row.put("orderNo", nz(rs.getString("order_no")));
                    row.put("tableId", rs.getLong("table_id"));
                    row.put("tableName", nz(rs.getString("table_name")));
                    row.put("date", asStr(rs.getObject("date")));
                    row.put("time", asStr(rs.getObject("time")));
                    row.put("isDelivered", rs.getInt("is_delivered"));
                    row.put("isBilled", rs.getInt("is_billed"));
                    row.put("isCancelled", rs.getInt("is_cancelled"));
                    return row;
                },
                orderId
        );
        if (headers.isEmpty()) {
            throw new RuntimeException("Order not found");
        }
        List<Map<String, Object>> items = jdbcTemplate.query(
                "SELECT pod.id, pod.prod_id, p.name, p.code, pod.qty, pod.price, pod.total, pod.is_delivered "
                        + "FROM prod_order_details pod JOIN prod_product p ON pod.prod_id = p.id "
                        + "WHERE pod.order_id = ?",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", rs.getLong("id"));
                    row.put("prodId", rs.getLong("prod_id"));
                    row.put("productName", nz(rs.getString("name")));
                    row.put("code", nz(rs.getString("code")));
                    row.put("qty", rs.getDouble("qty"));
                    row.put("price", rs.getDouble("price"));
                    row.put("total", rs.getDouble("total"));
                    row.put("isDelivered", rs.getInt("is_delivered"));
                    return row;
                },
                orderId
        );
        double grandTotal = items.stream().mapToDouble(r -> ((Number) r.get("total")).doubleValue()).sum();
        Map<String, Object> data = new LinkedHashMap<>(headers.get(0));
        data.put("items", items);
        data.put("grandTotal", grandTotal);
        return data;
    }

    @Transactional
    public boolean markOrderDelivered(Long orderId) {
        requireOpenOrder(orderId);
        jdbcTemplate.update("UPDATE prod_order_details SET is_delivered = 1 WHERE order_id = ?", orderId);
        jdbcTemplate.update("UPDATE prod_order SET is_delivered = 1 WHERE id = ?", orderId);
        return true;
    }

    @Transactional
    public boolean markItemDelivered(Long detailId) {
        if (detailId == null || detailId <= 0) {
            throw new RuntimeException("Order item not found");
        }
        List<Long> orderIds = jdbcTemplate.query(
                "SELECT pod.order_id FROM prod_order_details pod JOIN prod_order po ON po.id = pod.order_id "
                        + "WHERE pod.id = ? AND po.is_cancelled = 0 AND po.is_billed = 0",
                (rs, i) -> rs.getLong(1),
                detailId
        );
        if (orderIds.isEmpty()) {
            throw new RuntimeException("Order item not found");
        }
        jdbcTemplate.update("UPDATE prod_order_details SET is_delivered = 1 WHERE id = ?", detailId);
        Long orderId = orderIds.get(0);
        Integer pending = jdbcTemplate.query(
                "SELECT COUNT(*) FROM prod_order_details WHERE order_id = ? AND is_delivered = 0",
                rs -> rs.next() ? rs.getInt(1) : 0,
                orderId
        );
        if (pending != null && pending == 0) {
            jdbcTemplate.update("UPDATE prod_order SET is_delivered = 1 WHERE id = ?", orderId);
        }
        return true;
    }

    private void requireOpenOrder(Long orderId) {
        if (orderId == null || orderId <= 0) {
            throw new RuntimeException("Order not found");
        }
        Integer ok = jdbcTemplate.query(
                "SELECT id FROM prod_order WHERE id = ? AND is_cancelled = 0 AND is_billed = 0",
                rs -> rs.next() ? 1 : 0,
                orderId
        );
        if (ok == null || ok == 0) {
            throw new RuntimeException("Order not found");
        }
    }

    private String nz(String value) {
        return value == null ? "" : value;
    }

    private String asStr(Object value) {
        return value == null ? "" : value.toString();
    }
}
