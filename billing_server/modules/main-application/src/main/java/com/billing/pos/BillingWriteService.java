package com.billing.pos;

import com.billing.pos.dto.BillLineRequest;
import com.billing.pos.dto.HoldBillRequest;
import com.billing.pos.dto.SaveBillRequest;
import com.billing.pos.dto.SaveBillResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.Calendar;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BillingWriteService {

    private final JdbcTemplate jdbcTemplate;
    private final BillingReadService readService;

    @Transactional
    public SaveBillResponse saveBill(SaveBillRequest request, Long uid, String shopId) {
        if (request.getProducts() == null || request.getProducts().isEmpty()) {
            throw new RuntimeException("Empty Bill. Please Prepare Bill And Save.");
        }
        Long customerId = resolveCustomer(request);
        int isTaxBill = request.getIsTaxBill() == null ? 1 : request.getIsTaxBill();
        String billNo = nextBillNumber(isTaxBill);
        double cashPaid = nz(request.getCashPaid());
        double bankPaid = nz(request.getBankPaid());
        double totalPaid = cashPaid + bankPaid;
        double balance = nz(request.getBalance());
        int mode = request.getMode() == null ? 1 : request.getMode();
        int type = request.getType() == null ? 0 : request.getType();
        int priceCategory = request.getPriceCategory() == null ? 3 : request.getPriceCategory();
        String customerName = blankToDash(request.getCustomerName());
        String customerPhn = blankToDash(request.getCustomerPhn());

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO prod_bill (bill_display, total, extraDisc, payable, paid, uid, DATE, TIME, cusName, prodDisc, cusPhn, " +
                            "paymentMode, paymentType, balance, is_balance, currentBalance, customerId, price_category, attender_id, is_tax_bill, shop_id) " +
                            "VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, billNo);
            ps.setDouble(2, nz(request.getPriceTotal()));
            ps.setDouble(3, nz(request.getFinalDiscount()));
            ps.setDouble(4, nz(request.getPayableAmount()));
            ps.setDouble(5, totalPaid);
            ps.setLong(6, uid);
            ps.setString(7, customerName);
            ps.setDouble(8, nz(request.getDiscountTotal()));
            ps.setString(9, customerPhn);
            ps.setInt(10, mode);
            ps.setInt(11, type);
            ps.setDouble(12, balance);
            ps.setInt(13, balance > 0 ? 1 : 0);
            ps.setDouble(14, balance);
            if (customerId != null && customerId > 0) {
                ps.setLong(15, customerId);
            } else {
                ps.setNull(15, java.sql.Types.INTEGER);
            }
            ps.setInt(16, priceCategory);
            if (request.getAttenderId() != null && request.getAttenderId() > 0) {
                ps.setLong(17, request.getAttenderId());
            } else {
                ps.setNull(17, java.sql.Types.INTEGER);
            }
            ps.setInt(18, isTaxBill);
            if (shopId != null && !shopId.isBlank()) {
                ps.setString(19, shopId);
            } else {
                ps.setNull(19, java.sql.Types.VARCHAR);
            }
            return ps;
        }, keyHolder);
        long billId = requireGeneratedId(keyHolder);

        for (BillLineRequest line : request.getProducts()) {
            int gst = isTaxBill == 1 ? productGst(line.getId()) : 0;
            double cost = productCost(line.getId(), line.getBatchId());
            jdbcTemplate.update(
                    "INSERT INTO prod_bill_details (bill_id, prod_id, qty, price, disc, total, gst, cost, commission) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    billId, line.getId(), line.getQty(), line.getPrice(), nz(line.getDiscount()),
                    nz(line.getTotal()), gst, cost, nz(line.getCommission())
            );
        }

        jdbcTemplate.update(
                "INSERT INTO prod_bill_payment (bill_id, cash, bank, paymentType) VALUES (?, ?, ?, ?)",
                billId, cashPaid, bankPaid, type
        );

        jdbcTemplate.update(
                "INSERT INTO prod_ledger (bill_type, bill_id, customer_id, supplier_id, payment_mode, bill_amount, cash_paid, bank_paid, payment_type, uid, date_time) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                1, billId,
                customerId != null && customerId > 0 ? customerId : null,
                null, mode, nz(request.getPayableAmount()), cashPaid, bankPaid, type, uid
        );

        if (balance > 0 && customerId != null && customerId > 0) {
            addDueToCustomerAccount(customerId, balance);
        }

        boolean canBillWithoutStock = Boolean.TRUE.equals(readService.options(uid).getCanBillWithoutStock());
        for (BillLineRequest line : request.getProducts()) {
            updateStock(line.getId(), BigDecimal.valueOf(nz(line.getQty())), uid, line.getBatchId(), billId, "WHILE BILLING", canBillWithoutStock);
            try {
                reduceComponentStock(line.getId(), BigDecimal.valueOf(nz(line.getQty())), uid, billId, canBillWithoutStock);
            } catch (Exception ignored) {
                // BOM table may be empty; do not fail the bill
            }
        }

        if (request.getQuotationId() != null && request.getQuotationId() > 0) {
            jdbcTemplate.update("UPDATE prod_quotation SET is_billed = 1 WHERE id = ?", request.getQuotationId());
        }
        if (nz(request.getExchangePointUsed()) > 0 && customerId != null && customerId > 0) {
            useExchangePoint(customerId, billId, request.getExchangePointUsed(), uid);
        }

        return new SaveBillResponse(billNo, billId);
    }

    @Transactional
    public Map<String, Object> saveHold(HoldBillRequest request, Long uid) {
        if (request.getProducts() == null || request.getProducts().isEmpty()) {
            throw new RuntimeException("Empty hold. Add products first.");
        }
        int year = LocalDate.now().getYear() % 100;
        Integer maxId = jdbcTemplate.query(
                "SELECT MAX(id) AS maxId FROM prod_quotation WHERE YEAR(date) = YEAR(CURDATE())",
                rs -> rs.next() ? rs.getInt("maxId") : 0
        );
        String quotNo = "Q" + year + "-" + ((maxId == null ? 0 : maxId) + 1);
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO prod_quotation (bill_display, total, prodDisc, extraDisc, payable, cusName, cusPhn, customerId, date, time, uid, is_billed, is_cancelled) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, 0, 0)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, quotNo);
            ps.setDouble(2, nz(request.getPriceTotal()));
            ps.setDouble(3, nz(request.getDiscountTotal()));
            ps.setDouble(4, nz(request.getFinalDiscount()));
            ps.setDouble(5, nz(request.getPayableAmount()));
            ps.setString(6, blankToDash(request.getCustomerName()));
            ps.setString(7, blankToDash(request.getCustomerPhn()));
            if (request.getCustomerId() != null && request.getCustomerId() > 0) {
                ps.setLong(8, request.getCustomerId());
            } else {
                ps.setNull(8, java.sql.Types.INTEGER);
            }
            ps.setLong(9, uid);
            return ps;
        }, keyHolder);
        long quotId = requireGeneratedId(keyHolder);
        int isTaxBill = request.getIsTaxBill() == null ? 1 : request.getIsTaxBill();
        for (BillLineRequest line : request.getProducts()) {
            int gst = isTaxBill == 1 ? productGst(line.getId()) : 0;
            jdbcTemplate.update(
                    "INSERT INTO prod_quotation_details (quot_id, prod_id, qty, price, disc, total, gst, is_cancelled) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
                    quotId, line.getId(), line.getQty(), line.getPrice(), nz(line.getDiscount()), nz(line.getTotal()), gst
            );
        }
        return Map.of("quotNo", quotNo, "quotId", quotId);
    }

    @Transactional
    public void cancelHold(Long quotId) {
        jdbcTemplate.update("UPDATE prod_quotation SET is_cancelled = 1 WHERE id = ?", quotId);
    }

    private Long resolveCustomer(SaveBillRequest request) {
        Long customerId = request.getCustomerId() == null ? 0L : request.getCustomerId();
        String name = request.getCustomerName();
        if (name == null || name.isBlank() || "-".equals(name.trim())) {
            return customerId > 0 ? customerId : 0L;
        }
        if (customerId > 0) {
            return customerId;
        }
        List<Long> existing = jdbcTemplate.query(
                "SELECT id FROM customers WHERE name = ? LIMIT 1",
                (rs, i) -> rs.getLong(1),
                name.trim()
        );
        if (!existing.isEmpty()) {
            return existing.get(0);
        }
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO customers(name, date, time, address, phone_number, gstin, is_gst, is_eligible_for_commission) VALUES (?, NOW(), NOW(), '', ?, '', 0, ?)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, name.trim());
            ps.setString(2, request.getCustomerPhn() == null ? "" : request.getCustomerPhn());
            ps.setInt(3, request.getIsEligibleForCommission() == null ? 0 : request.getIsEligibleForCommission());
            return ps;
        }, keyHolder);
        long newId = requireGeneratedId(keyHolder);
        jdbcTemplate.update("INSERT INTO customer_account(customer_id, advance, balance) VALUES (?, 0.00, 0.00)", newId);
        return newId;
    }

    private String nextBillNumber(int isTaxBill) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(id) FROM prod_bill WHERE YEAR(DATE) = YEAR(CURDATE()) AND is_tax_bill = ?",
                Integer.class,
                isTaxBill
        );
        int nextId = (count == null ? 0 : count) + 1;
        if (isTaxBill == 1) {
            int year = Calendar.getInstance().get(Calendar.YEAR) % 100;
            return year + "-" + nextId;
        }
        return String.valueOf(nextId);
    }

    private void addDueToCustomerAccount(Long customerId, double dueAmount) {
        int rows = jdbcTemplate.update(
                "UPDATE customer_account SET balance = balance + ? WHERE customer_id = ?",
                dueAmount, customerId
        );
        if (rows == 0) {
            jdbcTemplate.update(
                    "INSERT INTO customer_account (customer_id, advance, balance) VALUES (?, 0.00, ?)",
                    customerId, dueAmount
            );
        }
    }

    private void updateStock(Long productId, BigDecimal qty, Long uid, Long batchId, long billId, String notes, boolean canBillWithoutStock) {
        if (productId == null || batchId == null || batchId == 0) {
            return;
        }
        BigDecimal currentStock = jdbcTemplate.query(
                "SELECT stock FROM prod_batch WHERE product_id = ? AND id = ?",
                rs -> rs.next() ? rs.getBigDecimal("stock") : BigDecimal.ZERO,
                productId, batchId
        );
        if (currentStock == null) {
            currentStock = BigDecimal.ZERO;
        }
        BigDecimal lastStockNow = jdbcTemplate.query(
                "SELECT stock_now FROM prod_lifecycle WHERE product_id = ? ORDER BY id DESC LIMIT 1",
                rs -> rs.next() ? rs.getBigDecimal("stock_now") : BigDecimal.ZERO,
                productId
        );
        if (lastStockNow == null) {
            lastStockNow = BigDecimal.ZERO;
        }

        if (currentStock.compareTo(qty) >= 0) {
            jdbcTemplate.update(
                    "UPDATE prod_batch SET stock = stock - ? WHERE product_id = ? AND id = ?",
                    qty, productId, batchId
            );
            jdbcTemplate.update(
                    "INSERT INTO prod_lifecycle (batch_id, stock_out, stock_now, notes, DATE, TIME, product_id, uid, bill_id) VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?, ?)",
                    batchId, qty, lastStockNow.subtract(qty), notes, productId, uid, billId
            );
        } else {
            jdbcTemplate.update(
                    "INSERT INTO prod_batch_zero_stock_bill (batch_id, qty, date, time, product_id, uid) VALUES (?, ?, NOW(), NOW(), ?, ?)",
                    batchId, qty, productId, uid
            );
            jdbcTemplate.update(
                    "INSERT INTO prod_lifecycle (batch_id, stock_out, stock_now, notes, DATE, TIME, product_id, uid, is_zero_stock_bill, bill_id) VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?, 1, ?)",
                    batchId, qty, lastStockNow, notes.contains("Bill of Materials") ? notes : " BILL WITHOUT STOCK", productId, uid, billId
            );
        }
    }

    private void reduceComponentStock(Long productId, BigDecimal qty, Long uid, long billId, boolean canBillWithoutStock) {
        List<Map<String, Object>> components = jdbcTemplate.queryForList(
                "SELECT c.quantity, p.id AS comp_prod_id, p.name FROM prod_product_components c " +
                        "JOIN prod_product p ON c.component_product_id = p.id " +
                        "WHERE c.product_id = ? AND p.is_active = 1",
                productId
        );
        if (components.isEmpty()) {
            return;
        }
        String productName = jdbcTemplate.query(
                "SELECT name FROM prod_product WHERE id = ?",
                rs -> rs.next() ? rs.getString(1) : "",
                productId
        );
        for (Map<String, Object> comp : components) {
            Long componentProductId = ((Number) comp.get("comp_prod_id")).longValue();
            double componentQty = ((Number) comp.get("quantity")).doubleValue();
            BigDecimal totalComponentQty = qty.multiply(BigDecimal.valueOf(componentQty));
            Long componentBatchId = jdbcTemplate.query(
                    "SELECT id FROM prod_batch WHERE product_id = ? AND stock > 0 ORDER BY id LIMIT 1",
                    rs -> rs.next() ? rs.getLong(1) : 0L,
                    componentProductId
            );
            if (componentBatchId != null && componentBatchId > 0) {
                updateStock(componentProductId, totalComponentQty, uid, componentBatchId, billId,
                        "Bill of Materials: " + productName, canBillWithoutStock);
            }
        }
    }

    private void useExchangePoint(Long customerId, long billId, double pointsUsed, Long uid) {
        Double oldPoint = jdbcTemplate.query(
                "SELECT IFNULL(exchange_point, 0) FROM customers WHERE id = ?",
                rs -> rs.next() ? rs.getDouble(1) : 0d,
                customerId
        );
        double actualDeduct = Math.min(pointsUsed, oldPoint == null ? 0 : oldPoint);
        double newPoint = BigDecimal.valueOf((oldPoint == null ? 0 : oldPoint) - actualDeduct)
                .setScale(3, RoundingMode.HALF_UP).doubleValue();
        if (newPoint < 0) {
            newPoint = 0;
        }
        jdbcTemplate.update("UPDATE customers SET exchange_point = ? WHERE id = ?", newPoint, customerId);
        jdbcTemplate.update(
                "INSERT INTO customers_exchange_point (customer_id, bill_id, old_point, exchange_point, total_point, uid, date_time, notes) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)",
                customerId, billId, oldPoint, -actualDeduct, newPoint, uid,
                "Points used as bill discount (Bill ID: " + billId + ", Used: " + String.format("%.2f", actualDeduct) + ")"
        );
    }

    private int productGst(Long productId) {
        Integer gst = jdbcTemplate.query(
                "SELECT gst FROM prod_product WHERE id = ?",
                rs -> rs.next() ? rs.getInt(1) : 0,
                productId
        );
        return gst == null ? 0 : gst;
    }

    private double productCost(Long productId, Long batchId) {
        if (productId == null || batchId == null) {
            return 0;
        }
        Double cost = jdbcTemplate.query(
                "SELECT cost FROM prod_batch WHERE product_id = ? AND id = ?",
                rs -> rs.next() ? rs.getDouble(1) : 0d,
                productId, batchId
        );
        return cost == null ? 0 : cost;
    }

    private long requireGeneratedId(KeyHolder keyHolder) {
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new RuntimeException("Failed to create record");
        }
        return key.longValue();
    }

    private double nz(Double value) {
        return value == null ? 0 : value;
    }

    private String blankToDash(String value) {
        return value == null || value.isBlank() ? "-" : value.trim();
    }
}
