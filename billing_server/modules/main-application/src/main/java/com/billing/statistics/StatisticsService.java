package com.billing.statistics;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StatisticsService {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    private final JdbcTemplate jdbcTemplate;

    public Map<String, Object> profit(String from, String to, String type) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        boolean billWise = "bill".equalsIgnoreCase(type);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("type", billWise ? "bill" : "product");
        if (billWise) {
            List<Map<String, Object>> rows = jdbcTemplate.query(
                    "SELECT a.bill_display, a.date, IFNULL(a.cusName,'-') AS cusName, "
                            + "SUM(CASE WHEN IFNULL(bd.is_cancelled,0)=0 AND IFNULL(bd.is_exchanged,0)<>2 "
                            + "THEN bd.cost * bd.qty ELSE 0 END) AS total_cost, "
                            + "SUM(CASE WHEN IFNULL(bd.is_cancelled,0)=0 AND IFNULL(bd.is_exchanged,0)<>2 "
                            + "THEN bd.total ELSE 0 END) AS sale_total "
                            + "FROM prod_bill a JOIN prod_bill_details bd ON a.id = bd.bill_id "
                            + "WHERE a.date BETWEEN ? AND ? AND a.is_cancelled = 0 "
                            + "GROUP BY a.id, a.bill_display, a.date, a.cusName "
                            + "ORDER BY a.date DESC, a.id DESC",
                    (rs, i) -> {
                        double cost = rs.getDouble("total_cost");
                        double sale = rs.getDouble("sale_total");
                        double profit = sale - cost;
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("billNo", rs.getString("bill_display"));
                        row.put("date", asStr(rs.getObject("date")));
                        row.put("customer", rs.getString("cusName"));
                        row.put("cost", cost);
                        row.put("sale", sale);
                        row.put("profit", profit);
                        row.put("margin", cost > 0 ? (profit / cost) * 100 : 0);
                        return row;
                    },
                    fromDate, toDate
            );
            data.put("rows", rows);
            fillProfitTotals(data, rows);
        } else {
            List<Map<String, Object>> rows = jdbcTemplate.query(
                    "SELECT a.bill_display, p.name, bd.qty, bd.cost, (bd.cost * bd.qty) AS total_cost, bd.total, a.date "
                            + "FROM prod_bill a JOIN prod_bill_details bd ON a.id = bd.bill_id "
                            + "JOIN prod_product p ON bd.prod_id = p.id "
                            + "WHERE a.date BETWEEN ? AND ? AND a.is_cancelled = 0 "
                            + "AND IFNULL(bd.is_cancelled, 0) = 0 AND IFNULL(bd.is_exchanged, 0) <> 2 "
                            + "ORDER BY a.date DESC, a.bill_display",
                    (rs, i) -> {
                        double cost = rs.getDouble("total_cost");
                        double sale = rs.getDouble("total");
                        double profit = sale - cost;
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("billNo", rs.getString("bill_display"));
                        row.put("productName", rs.getString("name"));
                        row.put("qty", rs.getDouble("qty"));
                        row.put("costPrice", rs.getDouble("cost"));
                        row.put("cost", cost);
                        row.put("sale", sale);
                        row.put("profit", profit);
                        row.put("margin", cost > 0 ? (profit / cost) * 100 : 0);
                        row.put("date", asStr(rs.getObject("date")));
                        return row;
                    },
                    fromDate, toDate
            );
            data.put("rows", rows);
            fillProfitTotals(data, rows);
        }
        return data;
    }

    public Map<String, Object> dashboard(Integer year, Integer month) {
        LocalDate now = LocalDate.now();
        int y = year == null ? now.getYear() : year;
        int m = month == null ? now.getMonthValue() : month;
        if (m < 1) m = 1;
        if (m > 12) m = 12;
        YearMonth ym = YearMonth.of(y, m);
        String start = ym.atDay(1).format(ISO);
        String end = ym.atEndOfMonth().format(ISO);
        YearMonth prev = ym.minusMonths(1);
        String prevStart = prev.atDay(1).format(ISO);
        String prevEnd = prev.atEndOfMonth().format(ISO);

        double sales = sum("SELECT COALESCE(SUM(payable),0) FROM prod_bill WHERE is_cancelled = 0 AND date BETWEEN ? AND ?", start, end);
        double lastSales = sum("SELECT COALESCE(SUM(payable),0) FROM prod_bill WHERE is_cancelled = 0 AND date BETWEEN ? AND ?", prevStart, prevEnd);
        double purchase = sum("SELECT COALESCE(SUM(total),0) FROM prod_purchase WHERE is_cancelled = 0 AND ent_date BETWEEN ? AND ?", start, end);
        double lastPurchase = sum("SELECT COALESCE(SUM(total),0) FROM prod_purchase WHERE is_cancelled = 0 AND ent_date BETWEEN ? AND ?", prevStart, prevEnd);
        double expense = sum("SELECT COALESCE(SUM(amount),0) FROM expense_entry WHERE is_active = 1 AND DATE(exc_date_time) BETWEEN ? AND ?", start, end);
        double lastExpense = sum("SELECT COALESCE(SUM(amount),0) FROM expense_entry WHERE is_active = 1 AND DATE(exc_date_time) BETWEEN ? AND ?", prevStart, prevEnd);
        double profit = productProfit(start, end);
        double lastProfit = productProfit(prevStart, prevEnd);
        double todaySales = sum("SELECT COALESCE(SUM(payable),0) FROM prod_bill WHERE is_cancelled = 0 AND DATE(date) = CURDATE()");
        Integer todayBillsVal = jdbcTemplate.query(
                "SELECT COUNT(*) FROM prod_bill WHERE is_cancelled = 0 AND DATE(date) = CURDATE()",
                rs -> rs.next() ? rs.getInt(1) : 0
        );
        int todayBills = todayBillsVal == null ? 0 : todayBillsVal;

        Map<String, Double> salesByDay = new HashMap<>();
        jdbcTemplate.query(
                "SELECT DATE(date) AS d, COALESCE(SUM(payable),0) AS t FROM prod_bill WHERE is_cancelled = 0 AND date BETWEEN ? AND ? GROUP BY DATE(date)",
                (rs, i) -> {
                    salesByDay.put(asStr(rs.getObject("d")), rs.getDouble("t"));
                    return null;
                },
                start, end
        );
        Map<String, Double> purchaseByDay = new HashMap<>();
        jdbcTemplate.query(
                "SELECT DATE(ent_date) AS d, COALESCE(SUM(total),0) AS t FROM prod_purchase WHERE is_cancelled = 0 AND ent_date BETWEEN ? AND ? GROUP BY DATE(ent_date)",
                (rs, i) -> {
                    purchaseByDay.put(asStr(rs.getObject("d")), rs.getDouble("t"));
                    return null;
                },
                start, end
        );
        List<Map<String, Object>> daily = new ArrayList<>();
        for (LocalDate day = ym.atDay(1); !day.isAfter(ym.atEndOfMonth()); day = day.plusDays(1)) {
            String key = day.format(ISO);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("date", day.format(DAY));
            row.put("sales", salesByDay.getOrDefault(key, 0d));
            row.put("purchase", purchaseByDay.getOrDefault(key, 0d));
            daily.add(row);
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("year", y);
        data.put("month", m);
        data.put("label", ym.getMonth().name().charAt(0) + ym.getMonth().name().substring(1).toLowerCase() + " " + y);
        data.put("sales", sales);
        data.put("lastSales", lastSales);
        data.put("salesPct", pct(sales, lastSales));
        data.put("purchase", purchase);
        data.put("lastPurchase", lastPurchase);
        data.put("purchasePct", pct(purchase, lastPurchase));
        data.put("expense", expense);
        data.put("lastExpense", lastExpense);
        data.put("expensePct", pct(expense, lastExpense));
        data.put("profit", profit);
        data.put("lastProfit", lastProfit);
        data.put("profitPct", pct(profit, lastProfit));
        data.put("netProfit", sales - purchase - expense);
        data.put("todaySales", todaySales);
        data.put("todayBills", todayBills);
        data.put("daily", daily);
        return data;
    }

    public Map<String, Object> categorySales(String from, String to) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        List<Map<String, Object>> rows = jdbcTemplate.query(
                "SELECT c.id, c.name, COALESCE(SUM(bd.qty), 0) AS total_qty, COALESCE(SUM(bd.total), 0) AS total_amount, "
                        + "COUNT(DISTINCT b.id) AS bill_count, COUNT(DISTINCT p.id) AS product_count "
                        + "FROM prod_category c "
                        + "LEFT JOIN prod_product p ON p.category_id = c.id "
                        + "LEFT JOIN prod_bill_details bd ON bd.prod_id = p.id "
                        + "LEFT JOIN prod_bill b ON b.id = bd.bill_id AND b.is_cancelled = 0 AND b.date BETWEEN ? AND ? "
                        + "WHERE c.is_active = 1 GROUP BY c.id, c.name ORDER BY total_amount DESC",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("catId", rs.getLong("id"));
                    row.put("catName", rs.getString("name"));
                    row.put("totalQty", rs.getDouble("total_qty"));
                    row.put("totalAmt", rs.getDouble("total_amount"));
                    row.put("billCount", rs.getInt("bill_count"));
                    row.put("productCount", rs.getInt("product_count"));
                    row.put("topProduct", "");
                    row.put("topProductQty", 0d);
                    return row;
                },
                fromDate, toDate
        );
        Map<Long, Object[]> top = new HashMap<>();
        jdbcTemplate.query(
                "SELECT p.category_id, p.name, SUM(bd.qty) AS tq FROM prod_bill_details bd "
                        + "JOIN prod_product p ON p.id = bd.prod_id "
                        + "JOIN prod_bill b ON b.id = bd.bill_id AND b.is_cancelled = 0 AND b.date BETWEEN ? AND ? "
                        + "GROUP BY p.category_id, p.id, p.name",
                (rs, i) -> {
                    long cid = rs.getLong(1);
                    double tq = rs.getDouble(3);
                    if (!top.containsKey(cid) || tq > (Double) top.get(cid)[1]) {
                        top.put(cid, new Object[]{nz(rs.getString(2)), tq});
                    }
                    return null;
                },
                fromDate, toDate
        );
        double grandAmt = 0;
        double grandQty = 0;
        int active = 0;
        for (Map<String, Object> row : rows) {
            Object[] hit = top.get(row.get("catId"));
            if (hit != null) {
                row.put("topProduct", hit[0]);
                row.put("topProductQty", hit[1]);
            }
            double amt = toD(row.get("totalAmt"));
            grandAmt += amt;
            grandQty += toD(row.get("totalQty"));
            if (amt > 0) active++;
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("categories", rows);
        data.put("grandAmt", grandAmt);
        data.put("grandQty", grandQty);
        data.put("totalCats", rows.size());
        data.put("activeCats", active);
        return data;
    }

    public List<Map<String, Object>> categoryProducts(Long catId, String from, String to) {
        if (catId == null || catId <= 0) {
            throw new RuntimeException("Category is required");
        }
        return jdbcTemplate.query(
                "SELECT p.id, p.name, COALESCE(SUM(bd.qty), 0) AS total_qty, COALESCE(SUM(bd.total), 0) AS total_amount, "
                        + "COUNT(DISTINCT b.id) AS bill_count, COALESCE(AVG(bd.price), 0) AS avg_price "
                        + "FROM prod_product p "
                        + "LEFT JOIN prod_bill_details bd ON bd.prod_id = p.id "
                        + "LEFT JOIN prod_bill b ON b.id = bd.bill_id AND b.is_cancelled = 0 AND b.date BETWEEN ? AND ? "
                        + "WHERE p.category_id = ? GROUP BY p.id, p.name ORDER BY total_amount DESC",
                (rs, i) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("productId", rs.getLong("id"));
                    row.put("productName", rs.getString("name"));
                    row.put("totalQty", rs.getDouble("total_qty"));
                    row.put("totalAmt", rs.getDouble("total_amount"));
                    row.put("billCount", rs.getInt("bill_count"));
                    row.put("avgPrice", rs.getDouble("avg_price"));
                    return row;
                },
                required(from, "From date is required"), required(to, "To date is required"), catId
        );
    }

    public Map<String, Object> productAnalysis(Long prodId, String from, String to) {
        if (prodId == null || prodId <= 0) {
            throw new RuntimeException("Select a product");
        }
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("sales", section(
                jdbcTemplate.query(
                        "SELECT b.bill_display, b.date, IFNULL(b.cusName,'Walk-in') AS cus, bd.qty, bd.price, bd.disc, bd.gst, bd.total, bd.cost, IFNULL(u.user_name,'—') AS uname "
                                + "FROM prod_bill_details bd JOIN prod_bill b ON bd.bill_id = b.id LEFT JOIN users u ON b.uid = u.id "
                                + "WHERE bd.prod_id = ? AND b.date BETWEEN ? AND ? AND b.is_cancelled = 0 AND bd.is_cancelled = 0 AND bd.is_exchanged = 0 "
                                + "ORDER BY b.date DESC, b.id DESC",
                        (rs, i) -> mapOf(
                                "bill", rs.getString(1), "date", asStr(rs.getObject(2)), "cus", rs.getString(3),
                                "qty", rs.getDouble(4), "price", rs.getDouble(5), "disc", rs.getDouble(6),
                                "gst", rs.getDouble(7), "total", rs.getDouble(8), "cost", rs.getDouble(9), "user", rs.getString(10)
                        ),
                        prodId, fromDate, toDate
                ), "qty", "total", "cost"
        ));
        data.put("salesReturn", section(
                jdbcTemplate.query(
                        "SELECT b.bill_display, b.date, IFNULL(b.cusName,'Walk-in'), bd.qty, bd.price, bd.total, IFNULL(u.user_name,'—') "
                                + "FROM prod_bill_details bd JOIN prod_bill b ON bd.bill_id = b.id LEFT JOIN users u ON b.uid = u.id "
                                + "WHERE bd.prod_id = ? AND b.date BETWEEN ? AND ? AND b.is_cancelled = 0 AND bd.is_exchanged = 2 "
                                + "ORDER BY b.date DESC, b.id DESC",
                        (rs, i) -> mapOf(
                                "bill", rs.getString(1), "date", asStr(rs.getObject(2)), "cus", rs.getString(3),
                                "qty", rs.getDouble(4), "price", rs.getDouble(5), "total", rs.getDouble(6), "user", rs.getString(7)
                        ),
                        prodId, fromDate, toDate
                ), "qty", "total", null
        ));
        data.put("purchase", section(
                jdbcTemplate.query(
                        "SELECT p.prno, p.invno, p.ent_date, IFNULL(s.name,'—'), pd.quantity, pd.free, pd.rate, pd.mrp, pd.disc_per, pd.tax, pd.totalamt, pd.netamt, IFNULL(u.user_name,'—') "
                                + "FROM prod_purchase_details pd JOIN prod_purchase p ON pd.prid = p.id "
                                + "LEFT JOIN prod_supplier s ON p.deal_id = s.id LEFT JOIN users u ON p.ent_uid = u.id "
                                + "WHERE pd.prods_id = ? AND p.ent_date BETWEEN ? AND ? AND p.is_cancelled = 0 AND pd.is_cancelled = 0 "
                                + "ORDER BY p.ent_date DESC, p.id DESC",
                        (rs, i) -> mapOf(
                                "prno", rs.getString(1), "invno", rs.getString(2), "date", asStr(rs.getObject(3)),
                                "supplier", rs.getString(4), "qty", rs.getDouble(5), "free", rs.getDouble(6),
                                "rate", rs.getDouble(7), "mrp", rs.getDouble(8), "disc", rs.getDouble(9), "tax", rs.getDouble(10),
                                "total", rs.getDouble(11), "netamt", rs.getDouble(12), "user", rs.getString(13)
                        ),
                        prodId, fromDate, toDate
                ), "qty", "netamt", null
        ));
        data.put("purchaseReturn", section(
                jdbcTemplate.query(
                        "SELECT pr.return_no, DATE(pr.date_time), IFNULL(s.name,'—'), prd.qty, prd.rate, prd.total, IFNULL(pr.notes,''), IFNULL(u.user_name,'—') "
                                + "FROM prod_purchase_return_details prd JOIN prod_purchase_return pr ON prd.return_id = pr.id "
                                + "LEFT JOIN prod_supplier s ON pr.supplier_id = s.id LEFT JOIN users u ON pr.uid = u.id "
                                + "WHERE prd.product_id = ? AND DATE(pr.date_time) BETWEEN ? AND ? ORDER BY pr.date_time DESC",
                        (rs, i) -> mapOf(
                                "returnNo", rs.getString(1), "date", asStr(rs.getObject(2)), "supplier", rs.getString(3),
                                "qty", rs.getDouble(4), "rate", rs.getDouble(5), "total", rs.getDouble(6),
                                "notes", rs.getString(7), "user", rs.getString(8)
                        ),
                        prodId, fromDate, toDate
                ), "qty", "total", null
        ));
        List<Map<String, Object>> exc = jdbcTemplate.query(
                "SELECT b.bill_display, DATE(e.date_time), IFNULL(b.cusName,'Walk-in'), old_p.name, new_p.name, "
                        + "CASE WHEN e.old_prod_id = ? THEN 'Out' ELSE 'In' END AS dir, IFNULL(u.user_name,'—') "
                        + "FROM pro_bill_exchange e JOIN prod_bill b ON e.bill_id = b.id "
                        + "JOIN prod_product old_p ON e.old_prod_id = old_p.id JOIN prod_product new_p ON e.new_prod_id = new_p.id "
                        + "LEFT JOIN users u ON b.uid = u.id "
                        + "WHERE (e.old_prod_id = ? OR e.new_prod_id = ?) AND DATE(e.date_time) BETWEEN ? AND ? ORDER BY e.date_time DESC",
                (rs, i) -> mapOf(
                        "bill", rs.getString(1), "date", asStr(rs.getObject(2)), "cus", rs.getString(3),
                        "oldProd", rs.getString(4), "newProd", rs.getString(5), "direction", rs.getString(6), "user", rs.getString(7)
                ),
                prodId, prodId, prodId, fromDate, toDate
        );
        int out = 0, in = 0;
        for (Map<String, Object> row : exc) {
            if ("Out".equals(row.get("direction"))) out++;
            else in++;
        }
        Map<String, Object> excSec = section(exc, null, null, null);
        excSec.put("outCount", out);
        excSec.put("inCount", in);
        data.put("exchange", excSec);
        data.put("cancelled", section(
                jdbcTemplate.query(
                        "SELECT b.bill_display, b.date, IFNULL(b.cusName,'Walk-in'), bd.qty, bd.price, bd.total, "
                                + "CASE WHEN b.is_cancelled = 1 THEN 'Bill' ELSE 'Item' END, IFNULL(u.user_name,'—') "
                                + "FROM prod_bill_details bd JOIN prod_bill b ON bd.bill_id = b.id LEFT JOIN users u ON b.uid = u.id "
                                + "WHERE bd.prod_id = ? AND b.date BETWEEN ? AND ? AND (b.is_cancelled = 1 OR bd.is_cancelled = 1) "
                                + "ORDER BY b.date DESC, b.id DESC",
                        (rs, i) -> mapOf(
                                "bill", rs.getString(1), "date", asStr(rs.getObject(2)), "cus", rs.getString(3),
                                "qty", rs.getDouble(4), "price", rs.getDouble(5), "total", rs.getDouble(6),
                                "cancelType", rs.getString(7), "user", rs.getString(8)
                        ),
                        prodId, fromDate, toDate
                ), "qty", "total", null
        ));
        List<Map<String, Object>> adj = jdbcTemplate.query(
                "SELECT psa.date, psa.time, psa.stockType, psa.stock, IFNULL(pu.convertion_unit,''), IFNULL(psa.notes,''), IFNULL(u.user_name,'—') "
                        + "FROM prod_stock_adjustment psa JOIN prod_product p ON psa.product_id = p.id "
                        + "JOIN users u ON psa.uid = u.id LEFT JOIN prod_units pu ON pu.id = p.unit_id "
                        + "WHERE psa.date BETWEEN ? AND ? AND psa.product_id = ? ORDER BY psa.date DESC, psa.time DESC",
                (rs, i) -> mapOf(
                        "date", asStr(rs.getObject(1)), "time", asStr(rs.getObject(2)), "stockType", rs.getString(3),
                        "stock", rs.getDouble(4), "unit", rs.getString(5), "notes", rs.getString(6), "user", rs.getString(7)
                ),
                fromDate, toDate, prodId
        );
        double add = 0, remove = 0;
        for (Map<String, Object> row : adj) {
            if ("1".equals(String.valueOf(row.get("stockType")))) add += toD(row.get("stock"));
            else remove += toD(row.get("stock"));
        }
        Map<String, Object> adjSec = section(adj, null, null, null);
        adjSec.put("totalAdd", add);
        adjSec.put("totalRemove", remove);
        data.put("stockAdj", adjSec);
        return data;
    }

    public Map<String, Object> balanceSummary(String from, String to) {
        String fromDate = required(from, "From date is required");
        String toDate = required(to, "To date is required");
        double opening = jdbcTemplate.query(
                "SELECT COALESCE(SUM(s.in_amt),0) - COALESCE(SUM(s.out_amt),0) AS bal FROM ("
                        + " SELECT payable AS in_amt, 0.0 AS out_amt FROM prod_bill WHERE date < ?"
                        + " UNION ALL SELECT 0.0, net FROM prod_purchase WHERE ent_date < ? AND is_cancelled=0 AND is_po=0"
                        + " UNION ALL SELECT 0.0, amount FROM expense_entry WHERE DATE(exc_date_time) < ? AND is_active=1"
                        + " UNION ALL SELECT 0.0, pb.payable FROM prod_bill_cancel bc JOIN prod_bill pb ON pb.id=bc.bill_id WHERE bc.date < ?"
                        + " UNION ALL SELECT total, 0.0 FROM prod_purchase_return WHERE DATE(date_time) < ?"
                        + ") s",
                rs -> rs.next() ? rs.getDouble(1) : 0d,
                fromDate, fromDate, fromDate, fromDate, fromDate
        );
        List<Map<String, Object>> rows = jdbcTemplate.query(
                "SELECT t.txn_date, t.content, t.in_amt, t.out_amt, COALESCE(u.user_name,'?') AS uname, t.type FROM ("
                        + " SELECT pb.date AS txn_date, pb.time AS txn_time, CONCAT('Bill #',pb.bill_display) AS content, "
                        + " pb.payable AS in_amt, 0.0 AS out_amt, pb.uid AS uid, 'Sale' AS type FROM prod_bill pb WHERE pb.date BETWEEN ? AND ?"
                        + " UNION ALL SELECT pp.ent_date, pp.ent_time, CONCAT('GRN #',pp.prno), 0.0, pp.net, pp.ent_uid, 'Purchase' "
                        + " FROM prod_purchase pp WHERE pp.ent_date BETWEEN ? AND ? AND pp.is_cancelled=0 AND pp.is_po=0"
                        + " UNION ALL SELECT DATE(ee.exc_date_time), TIME(ee.exc_date_time), ee.content, 0.0, ee.amount, ee.uid, 'Expense' "
                        + " FROM expense_entry ee WHERE DATE(ee.exc_date_time) BETWEEN ? AND ? AND ee.is_active=1"
                        + " UNION ALL SELECT bc.date, bc.time, CONCAT('Cancel #',pb2.bill_display), 0.0, pb2.payable, bc.uid, 'Cancel' "
                        + " FROM prod_bill_cancel bc JOIN prod_bill pb2 ON pb2.id=bc.bill_id WHERE bc.date BETWEEN ? AND ?"
                        + " UNION ALL SELECT DATE(pr.date_time), TIME(pr.date_time), CONCAT('Return #',COALESCE(pr.return_no,CAST(pr.id AS CHAR))), pr.total, 0.0, pr.uid, 'Purchase Return' "
                        + " FROM prod_purchase_return pr WHERE DATE(pr.date_time) BETWEEN ? AND ?"
                        + ") t LEFT JOIN users u ON u.id = t.uid ORDER BY t.txn_date, t.txn_time, t.type",
                (rs, i) -> mapOf(
                        "date", asStr(rs.getObject("txn_date")), "content", nz(rs.getString("content")),
                        "inAmt", rs.getDouble("in_amt"), "outAmt", rs.getDouble("out_amt"),
                        "userName", nz(rs.getString("uname")), "type", rs.getString("type")
                ),
                fromDate, toDate, fromDate, toDate, fromDate, toDate, fromDate, toDate, fromDate, toDate
        );
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("opening", opening);
        data.put("rows", rows);
        return data;
    }

    private void fillProfitTotals(Map<String, Object> data, List<Map<String, Object>> rows) {
        double cost = 0, sale = 0, profit = 0;
        for (Map<String, Object> row : rows) {
            cost += toD(row.get("cost"));
            sale += toD(row.get("sale"));
            profit += toD(row.get("profit"));
        }
        data.put("totalCost", cost);
        data.put("totalSale", sale);
        data.put("totalProfit", profit);
        data.put("marginPct", cost > 0 ? (profit / cost) * 100 : 0);
    }

    private double productProfit(String from, String to) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT bd.cost, bd.qty, bd.total FROM prod_bill a JOIN prod_bill_details bd ON a.id = bd.bill_id "
                        + "WHERE a.date BETWEEN ? AND ? AND a.is_cancelled = 0 "
                        + "AND IFNULL(bd.is_cancelled, 0) = 0 AND IFNULL(bd.is_exchanged, 0) <> 2",
                from, to
        );
        double profit = 0;
        for (Map<String, Object> row : rows) {
            double cost = toD(row.get("cost")) * toD(row.get("qty"));
            if (cost > 0) profit += toD(row.get("total")) - cost;
        }
        return profit;
    }

    private Map<String, Object> section(List<Map<String, Object>> rows, String qtyKey, String amtKey, String costKey) {
        double qty = 0, amt = 0, cost = 0;
        for (Map<String, Object> row : rows) {
            if (qtyKey != null) qty += toD(row.get(qtyKey));
            if (amtKey != null) amt += toD(row.get(amtKey));
            if (costKey != null) cost += toD(row.get(costKey)) * toD(row.get(qtyKey));
        }
        Map<String, Object> sec = new LinkedHashMap<>();
        sec.put("rows", rows);
        sec.put("count", rows.size());
        sec.put("totalQty", qty);
        sec.put("totalAmt", amt);
        if (costKey != null) sec.put("totalCost", cost);
        return sec;
    }

    private double sum(String sql, Object... args) {
        Double value = args.length == 0
                ? jdbcTemplate.query(sql, rs -> rs.next() ? rs.getDouble(1) : 0d)
                : jdbcTemplate.query(sql, rs -> rs.next() ? rs.getDouble(1) : 0d, args);
        return value == null ? 0 : value;
    }

    private double pct(double current, double previous) {
        return previous != 0 ? ((current - previous) / previous) * 100 : 0;
    }

    private Map<String, Object> mapOf(Object... kv) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            map.put(String.valueOf(kv[i]), kv[i + 1]);
        }
        return map;
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

    private double toD(Object value) {
        if (value == null) return 0;
        if (value instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
