package com.billing.inventory;

import com.billing.inventory.dto.PurchaseDetailLine;
import com.billing.inventory.dto.PurchaseHistoryData;
import com.billing.inventory.dto.PurchaseLineRequest;
import com.billing.inventory.dto.PurchaseLookupsData;
import com.billing.inventory.dto.PurchaseProductData;
import com.billing.inventory.dto.PurchaseReportRow;
import com.billing.inventory.dto.PurchaseReturnHistoryRow;
import com.billing.inventory.dto.PurchaseReturnItem;
import com.billing.inventory.dto.PurchaseReturnReportRow;
import com.billing.inventory.dto.ReturnBillData;
import com.billing.inventory.dto.ReturnLineData;
import com.billing.inventory.dto.SavePurchaseRequest;
import com.billing.inventory.dto.SavePurchaseReturnRequest;
import com.billing.inventory.dto.SupplierData;
import com.billing.inventory.dto.SupplierPaymentRow;
import com.billing.inventory.dto.SupplierSaveRequest;
import com.billing.master.dto.NamedItemData;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final JdbcTemplate jdbcTemplate;

    public List<SupplierData> suppliers() {
        return jdbcTemplate.query(
                "SELECT id, NAME AS name, " +
                        "CASE WHEN description = '' OR description IS NULL THEN '-' ELSE description END AS description, " +
                        "CASE WHEN phone_number = '' OR phone_number IS NULL THEN '-' ELSE phone_number END AS phone_number, " +
                        "CASE WHEN gstin = '' OR gstin IS NULL THEN '-' ELSE gstin END AS gstin, " +
                        "COALESCE(is_gst, 0) AS is_gst " +
                        "FROM prod_supplier WHERE is_active = 1 ORDER BY NAME",
                this::mapSupplier
        );
    }

    @Transactional
    public void saveSupplier(SupplierSaveRequest request) {
        String name = required(request.getName(), "Supplier name is required");
        if (nameExists(name, request.getId())) {
            throw new RuntimeException("Supplier name already exists!");
        }
        String desc = nz(request.getDescription());
        String phone = nz(request.getPhone());
        String gstin = nz(request.getGstin());
        int isGst = request.getIsGst() == null ? 0 : request.getIsGst();
        if (request.getId() != null && request.getId() > 0) {
            jdbcTemplate.update(
                    "UPDATE prod_supplier SET name=?, phone_number=?, description=?, gstin=?, is_gst=? WHERE id=?",
                    name, phone, desc, gstin, isGst, request.getId()
            );
        } else {
            KeyHolder keys = new GeneratedKeyHolder();
            jdbcTemplate.update(con -> {
                PreparedStatement ps = con.prepareStatement(
                        "INSERT INTO prod_supplier(NAME, date, time, description, phone_number, gstin, is_gst) VALUES (?, NOW(), NOW(), ?, ?, ?, ?)",
                        Statement.RETURN_GENERATED_KEYS
                );
                ps.setString(1, name);
                ps.setString(2, desc);
                ps.setString(3, phone);
                ps.setString(4, gstin);
                ps.setInt(5, isGst);
                return ps;
            }, keys);
            long id = requireGeneratedId(keys);
            jdbcTemplate.update("INSERT INTO supplier_account(supplier_id, advance, balance) VALUES (?, 0.00, 0.00)", id);
        }
    }

    @Transactional
    public void blockSupplier(Long id) {
        jdbcTemplate.update("UPDATE prod_supplier SET is_active = 0 WHERE id = ?", id);
    }

    public PurchaseLookupsData lookups() {
        PurchaseLookupsData data = new PurchaseLookupsData();
        data.setSuppliers(suppliers());
        data.setPaymentTypes(jdbcTemplate.query(
                "SELECT id, NAME AS name FROM configure_payment_type WHERE is_blocked = 0",
                this::mapNamed
        ));
        data.setBanks(jdbcTemplate.query(
                "SELECT id, NAME AS name FROM configure_bank_details WHERE is_blocked = 0",
                this::mapNamed
        ));
        return data;
    }

    public List<String> searchProductNames(String term) {
        String like = "%" + term + "%";
        return jdbcTemplate.query(
                "SELECT name FROM prod_product WHERE is_active = 1 AND (name LIKE ? OR CAST(code AS CHAR) LIKE ?) " +
                        "ORDER BY CASE WHEN CAST(code AS CHAR) = ? THEN 0 WHEN CAST(code AS CHAR) LIKE ? THEN 1 ELSE 2 END, name LIMIT 20",
                (rs, i) -> rs.getString(1),
                like, like, term, term + "%"
        );
    }

    public PurchaseProductData productByName(String name) {
        List<PurchaseProductData> rows = jdbcTemplate.query(productSql("a.name = ?"), this::mapProduct, name);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public PurchaseProductData productByCode(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        List<PurchaseProductData> rows = jdbcTemplate.query(
                productSql("CAST(a.code AS CHAR) = ? AND a.is_active = 1"),
                this::mapProduct,
                code.trim()
        );
        return rows.isEmpty() ? null : rows.get(0);
    }

    public PurchaseProductData productById(Long id) {
        List<PurchaseProductData> rows = jdbcTemplate.query(productSql("a.id = ?"), this::mapProduct, id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public List<PurchaseHistoryData> productHistory(String name) {
        return jdbcTemplate.query(
                "SELECT s.name AS supplier_name, DATE_FORMAT(p.ent_date, '%d-%m-%Y') AS formatted_date, " +
                        "DATE_FORMAT(p.ent_time, '%H:%i') AS formatted_time, p.invno, pd.quantity, pd.free, pd.rate, pd.mrp, pd.disc, pd.tax, " +
                        "COALESCE(u.name,'') AS unit_name " +
                        "FROM prod_purchase p " +
                        "JOIN prod_purchase_details pd ON p.id = pd.prid " +
                        "JOIN prod_product pp ON pd.prods_id = pp.id " +
                        "JOIN prod_supplier s ON p.deal_id = s.id " +
                        "LEFT JOIN prod_units u ON u.id = pp.unit_id " +
                        "WHERE pp.name = ? AND p.is_cancelled = 0 AND p.is_po = 0 " +
                        "ORDER BY p.invdate DESC, p.ent_time DESC, p.id DESC LIMIT 6",
                (rs, i) -> {
                    PurchaseHistoryData row = new PurchaseHistoryData();
                    row.setSupplierName(rs.getString("supplier_name"));
                    row.setDateTime(rs.getString("formatted_date") + " " + rs.getString("formatted_time"));
                    row.setInvoiceNo(rs.getString("invno"));
                    row.setQty(rs.getDouble("quantity"));
                    row.setFree(rs.getDouble("free"));
                    row.setCost(rs.getDouble("rate"));
                    row.setMrp(rs.getDouble("mrp"));
                    row.setDisc(rs.getDouble("disc"));
                    row.setTax(rs.getDouble("tax"));
                    row.setUnitName(rs.getString("unit_name"));
                    return row;
                },
                name
        );
    }

    @Transactional
    public String savePurchase(SavePurchaseRequest request, Long uid) {
        if (request.getSupplierId() == null || request.getSupplierId() <= 0) {
            throw new RuntimeException("Please select supplier name.");
        }
        if (request.getInvoiceNo() == null || request.getInvoiceNo().isBlank()) {
            throw new RuntimeException("Please enter invoice number.");
        }
        if (request.getInvoiceDate() == null || request.getInvoiceDate().isBlank()) {
            throw new RuntimeException("Please select invoice date.");
        }
        if (request.getPayType() == null || request.getPayType() == 0) {
            throw new RuntimeException("Please select payment mode.");
        }
        if (request.getPayType() != 1 && (request.getBankId() == null || request.getBankId() == 0)) {
            throw new RuntimeException("Please select payment mode (Bank details).");
        }
        if (request.getProducts() == null || request.getProducts().isEmpty()) {
            throw new RuntimeException("Please add at least one product with quantity.");
        }
        double grandTotal = nz(request.getGrandTotal());
        if (grandTotal <= 0) {
            throw new RuntimeException("Grand total must be greater than zero.");
        }
        double paid = nz(request.getPaidAmount());
        double extra = nz(request.getExtraDisc());
        double balance = nz(request.getBalanceAmount());
        if (paid < 0 || balance < 0) {
            throw new RuntimeException("Paid / balance cannot be negative.");
        }
        int bankId = request.getBankId() == null ? 0 : request.getBankId();

        Integer next = jdbcTemplate.queryForObject("SELECT COUNT(id)+1 FROM prod_purchase", Integer.class);
        final String purchaseNo = "GRN-" + (next == null ? 1 : next);

        KeyHolder keys = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO prod_purchase(prno,invno,invdate,total,paid,balance,discount,net,ent_uid,pay_type,bank_id,deal_id,offer,offer_date,lr_no,lr_date,lr_name,ent_date,ent_time) " +
                            "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, purchaseNo);
            ps.setString(2, request.getInvoiceNo().trim());
            ps.setString(3, request.getInvoiceDate());
            ps.setDouble(4, grandTotal);
            ps.setDouble(5, paid);
            ps.setDouble(6, balance);
            ps.setDouble(7, extra);
            ps.setDouble(8, grandTotal);
            ps.setLong(9, uid);
            ps.setInt(10, request.getPayType());
            ps.setInt(11, bankId);
            ps.setLong(12, request.getSupplierId());
            ps.setNull(13, java.sql.Types.VARCHAR);
            ps.setNull(14, java.sql.Types.VARCHAR);
            ps.setNull(15, java.sql.Types.VARCHAR);
            ps.setNull(16, java.sql.Types.VARCHAR);
            ps.setNull(17, java.sql.Types.VARCHAR);
            return ps;
        }, keys);
        long purchaseId = requireGeneratedId(keys);

        jdbcTemplate.update(
                "INSERT INTO prod_purchase_supplier_payment(prid, deal_id, total, paid, balance, is_active) VALUES(?,?,?,?,?,1)",
                purchaseId, request.getSupplierId(), grandTotal, paid, balance
        );
        Long supPayId = jdbcTemplate.queryForObject("SELECT MAX(id) FROM prod_purchase_supplier_payment WHERE prid = ?", Long.class, purchaseId);
        jdbcTemplate.update(
                "INSERT INTO prod_purchase_supplier_payment_details(supPayId, payable, paid, balance, pay_type, pay_mode, uid, notes, date, time) VALUES(?,?,?,?,?,?,?,?,NOW(),NOW())",
                supPayId, grandTotal, paid, balance, request.getPayType(), bankId, uid, "Payment for Purchase Bill"
        );

        for (PurchaseLineRequest line : request.getProducts()) {
            if (line.getQty() == null || line.getQty() <= 0) continue;
            long productId = resolveProductId(line);
            double totQty = nz(line.getQty());
            double freeQty = nz(line.getFreeQty());
            double cost = nz(line.getCost());
            double mrp = nz(line.getMrp());
            double disc = nz(line.getDisc());
            double tax = nz(line.getTax());
            double convertionCalc = line.getConvertionCalc() == null || line.getConvertionCalc() <= 0 ? 1 : line.getConvertionCalc();
            double totalamt = totQty * cost;
            double taxamt = totalamt * (tax / 100);
            double netamt = totalamt + taxamt;
            double sgstper = tax / 2;
            double unitcost = totQty > 0 ? cost / totQty : 0;
            double unitmrp = totQty > 0 ? mrp / totQty : 0;

            jdbcTemplate.update(
                    "INSERT INTO prod_purchase_details(prid,prods_id,pack,qtypack,quantity,free,rate,mrp,totalamt,tax,tax_amt,disc_per,disc,netamt,isinvoicereceived,sgst_per,cgst_per,sgst_amt,cgst_amt,unitrate,unitmrp) " +
                            "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    purchaseId, productId, 1, totQty, totQty, freeQty, cost, mrp, totalamt, tax, taxamt, disc, 0, netamt,
                    1, sgstper, sgstper, taxamt / 2, taxamt / 2, unitcost, unitmrp
            );

            BigDecimal stock = BigDecimal.valueOf((totQty + freeQty) * convertionCalc);
            double convertedCost = convertionCalc > 1 ? cost / convertionCalc : cost;
            double convertedMrp = convertionCalc > 1 ? mrp / convertionCalc : mrp;
            jdbcTemplate.update("UPDATE prod_product SET gst=? WHERE id = ?", tax, productId);
            jdbcTemplate.update("UPDATE prod_batch SET stock = stock + ?, cost = ?, mrp = ? WHERE product_id = ?",
                    stock, convertedCost, convertedMrp, productId);

            Integer totId = jdbcTemplate.query(
                    "SELECT id FROM prod_stock_totals WHERE prods_id = ?",
                    rs -> rs.next() ? rs.getInt(1) : 0,
                    productId
            );
            BigDecimal stockNow = jdbcTemplate.query(
                    "SELECT stock_now FROM prod_lifecycle WHERE product_id =? ORDER BY id DESC LIMIT 1",
                    rs -> rs.next() ? rs.getBigDecimal(1) : BigDecimal.ZERO,
                    productId
            );
            if (stockNow == null) stockNow = BigDecimal.ZERO;
            jdbcTemplate.update(
                    "INSERT INTO prod_lifecycle(batch_id,product_id,stock_in,stock_now,is_zero_stock_bill,notes,uid,stock_type,DATE,TIME) VALUES(?,?,?,?,?,?,?,?,NOW(),NOW())",
                    1, productId, stock, stock.add(stockNow), 2, "While Stock Added Through Purchase Entry", uid, 2
            );
            if (totId == null || totId == 0) {
                jdbcTemplate.update("INSERT INTO prod_stock_totals(prods_id,stock,userlog) VALUES(?,?,?)",
                        productId, stock, "While Stock Added Through Purchase Entry");
            } else {
                jdbcTemplate.update("UPDATE prod_stock_totals SET stock=stock+?,userlog=? WHERE prods_id=?",
                        stock, "While Stock Added Through Purchase Entry", productId);
            }
        }

        int paymentMode = request.getPayType() == 1 ? 1 : 2;
        double cashPaid = request.getPayType() == 1 ? paid : 0;
        double bankPaid = request.getPayType() != 1 ? paid : 0;
        jdbcTemplate.update(
                "INSERT INTO prod_ledger (bill_type, bill_id, customer_id, supplier_id, payment_mode, bill_amount, cash_paid, bank_paid, payment_type, uid, date_time) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                5, purchaseId, null, request.getSupplierId(), paymentMode, grandTotal, cashPaid, bankPaid, request.getPayType(), uid
        );
        if (balance > 0) {
            addDueToSupplier(request.getSupplierId(), balance);
        }
        return purchaseNo;
    }

    public List<PurchaseReportRow> purchaseReport(String from, String to, Long supplierId) {
        StringBuilder sql = new StringBuilder(
                "SELECT a.id, a.invno, a.invdate, a.total, a.paid, a.balance, a.ent_date, a.ent_time, b.user_name, c.name, a.prno " +
                        "FROM prod_purchase a, users b, prod_supplier c " +
                        "WHERE a.ent_uid = b.id AND c.id = a.deal_id AND a.ent_date BETWEEN ? AND ? " +
                        "AND a.is_cancelled = 0 AND a.invno != '' "
        );
        List<Object> args = new ArrayList<>();
        args.add(from);
        args.add(to);
        if (supplierId != null && supplierId > 0) {
            sql.append("AND a.deal_id = ? ");
            args.add(supplierId);
        }
        return jdbcTemplate.query(sql.toString(), (rs, i) -> {
            PurchaseReportRow row = new PurchaseReportRow();
            row.setId(rs.getLong(1));
            row.setInvoiceNo(rs.getString(2));
            row.setInvoiceDate(rs.getString(3));
            row.setTotal(rs.getDouble(4));
            row.setPaid(rs.getDouble(5));
            row.setBalance(rs.getDouble(6));
            row.setEntryDate(rs.getString(7));
            row.setEntryTime(rs.getString(8));
            row.setUserName(rs.getString(9));
            row.setSupplierName(rs.getString(10));
            row.setPrno(rs.getString(11));
            return row;
        }, args.toArray());
    }

    public List<PurchaseDetailLine> purchaseDetails(Long id) {
        return jdbcTemplate.query(
                "SELECT pd.id, p.name AS product_name, pd.pack, pd.qtypack, pd.quantity, pd.free, " +
                        "pd.rate, pd.mrp, pd.totalamt, pd.tax, pd.netamt " +
                        "FROM prod_purchase_details pd JOIN prod_product p ON pd.prods_id = p.id WHERE pd.prid = ?",
                (rs, i) -> {
                    PurchaseDetailLine row = new PurchaseDetailLine();
                    row.setId(rs.getLong(1));
                    row.setProductName(rs.getString(2));
                    row.setPack(rs.getDouble(3));
                    row.setQtyPack(rs.getDouble(4));
                    row.setQuantity(rs.getDouble(5));
                    row.setFree(rs.getDouble(6));
                    row.setRate(rs.getDouble(7));
                    row.setMrp(rs.getDouble(8));
                    row.setTotalAmt(rs.getDouble(9));
                    row.setTax(rs.getDouble(10));
                    row.setNetAmt(rs.getDouble(11));
                    return row;
                },
                id
        );
    }

    public ReturnBillData purchaseForReturn(String search) {
        if (search == null || search.isBlank()) {
            throw new RuntimeException("Enter purchase ID or bill no");
        }
        Long purchaseId;
        try {
            purchaseId = Long.parseLong(search.trim());
        } catch (NumberFormatException e) {
            List<Long> ids = jdbcTemplate.query(
                    "SELECT id FROM prod_purchase WHERE prno = ? AND is_cancelled = 0 LIMIT 1",
                    (rs, i) -> rs.getLong(1),
                    search.trim()
            );
            if (ids.isEmpty()) {
                throw new RuntimeException("Purchase not found for: " + search);
            }
            purchaseId = ids.get(0);
        }
        List<Map<String, Object>> headers = jdbcTemplate.query(
                "SELECT a.id, a.prno, a.invno, a.invdate, a.total, c.name " +
                        "FROM prod_purchase a JOIN prod_supplier c ON c.id = a.deal_id " +
                        "WHERE a.id = ? AND a.is_cancelled = 0",
                (rs, i) -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", rs.getLong(1));
                    map.put("prno", rs.getString(2));
                    map.put("invno", rs.getString(3));
                    map.put("invdate", rs.getString(4));
                    map.put("total", rs.getDouble(5));
                    map.put("supplier", rs.getString(6));
                    return map;
                },
                purchaseId
        );
        if (headers.isEmpty()) {
            throw new RuntimeException("Purchase not found.");
        }
        Map<Long, Double> returned = new HashMap<>();
        jdbcTemplate.query(
                "SELECT prd.purchase_detail_id, IFNULL(SUM(prd.qty),0) FROM prod_purchase_return_details prd " +
                        "JOIN prod_purchase_return pr ON prd.return_id = pr.id WHERE pr.purchase_id = ? GROUP BY prd.purchase_detail_id",
                (rs, i) -> {
                    returned.put(rs.getLong(1), rs.getDouble(2));
                    return null;
                },
                purchaseId
        );
        List<ReturnLineData> items = new ArrayList<>();
        jdbcTemplate.query(
                "SELECT pd.id, p.name, pd.quantity, pd.free, pd.rate, pd.mrp, IFNULL(pd.is_cancelled,0) " +
                        "FROM prod_purchase_details pd JOIN prod_product p ON pd.prods_id = p.id WHERE pd.prid = ?",
                (rs, i) -> {
                    if (rs.getInt(7) == 1) return null;
                    double orig = rs.getDouble(3) + rs.getDouble(4);
                    double already = returned.getOrDefault(rs.getLong(1), 0d);
                    double available = Math.max(0, orig - already);
                    ReturnLineData line = new ReturnLineData();
                    line.setDetailId(rs.getLong(1));
                    line.setProduct(rs.getString(2));
                    line.setQty(rs.getDouble(3));
                    line.setFree(rs.getDouble(4));
                    line.setRate(rs.getDouble(5));
                    line.setMrp(rs.getDouble(6));
                    line.setAlreadyReturned(already);
                    line.setAvailableQty(available);
                    items.add(line);
                    return null;
                },
                purchaseId
        );
        Map<String, Object> h = headers.get(0);
        ReturnBillData data = new ReturnBillData();
        data.setId((Long) h.get("id"));
        data.setPrno((String) h.get("prno"));
        data.setInvoiceNo((String) h.get("invno"));
        data.setInvoiceDate(String.valueOf(h.get("invdate")));
        data.setTotal((Double) h.get("total"));
        data.setSupplierName((String) h.get("supplier"));
        data.setItems(items);
        return data;
    }

    @Transactional
    public String savePurchaseReturn(SavePurchaseReturnRequest request, Long uid) {
        if (request.getPurchaseId() == null || request.getItems() == null || request.getItems().isEmpty()) {
            throw new RuntimeException("Select items to return");
        }
        Long purchaseId = request.getPurchaseId();
        Long supplierId = jdbcTemplate.query(
                "SELECT deal_id FROM prod_purchase WHERE id = ?",
                rs -> rs.next() ? rs.getLong(1) : 0L,
                purchaseId
        );
        Integer next = jdbcTemplate.queryForObject("SELECT COUNT(id)+1 FROM prod_purchase_return", Integer.class);
        final String returnNo = "RTN" + (next == null ? 1 : next);
        KeyHolder keys = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO prod_purchase_return(return_no, purchase_id, supplier_id, total, notes, uid, date_time) VALUES(?,?,?,0,?,?,NOW())",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, returnNo);
            ps.setLong(2, purchaseId);
            ps.setLong(3, supplierId == null ? 0 : supplierId);
            ps.setString(4, request.getNotes() == null ? "" : request.getNotes());
            ps.setLong(5, uid);
            return ps;
        }, keys);
        long returnId = requireGeneratedId(keys);
        double grand = 0;
        for (PurchaseReturnItem item : request.getItems()) {
            if (item.getQty() == null || item.getQty() <= 0) continue;
            Map<String, Object> detail = jdbcTemplate.query(
                    "SELECT prods_id, quantity, free FROM prod_purchase_details WHERE id = ? AND prid = ? AND IFNULL(is_cancelled,0)=0",
                    rs -> {
                        if (!rs.next()) return null;
                        Map<String, Object> map = new HashMap<>();
                        map.put("productId", rs.getLong(1));
                        map.put("orig", rs.getDouble(2) + rs.getDouble(3));
                        return map;
                    },
                    item.getDetailId(), purchaseId
            );
            if (detail == null) {
                throw new RuntimeException("Purchase detail not found or cancelled.");
            }
            long productId = (Long) detail.get("productId");
            double origQty = (Double) detail.get("orig");
            Double already = jdbcTemplate.query(
                    "SELECT IFNULL(SUM(prd.qty),0) FROM prod_purchase_return_details prd " +
                            "JOIN prod_purchase_return pr ON prd.return_id = pr.id " +
                            "WHERE prd.purchase_detail_id = ? AND pr.purchase_id = ?",
                    rs -> rs.next() ? rs.getDouble(1) : 0d,
                    item.getDetailId(), purchaseId
            );
            double available = origQty - (already == null ? 0 : already);
            if (item.getQty() > available) {
                throw new RuntimeException("Return qty exceeds available qty " + available);
            }
            BigDecimal rQty = BigDecimal.valueOf(item.getQty()).setScale(3, RoundingMode.HALF_UP);
            BigDecimal currentStock = jdbcTemplate.query(
                    "SELECT IFNULL(stock,0) FROM prod_stock_totals WHERE prods_id = ?",
                    rs -> rs.next() ? rs.getBigDecimal(1) : BigDecimal.ZERO,
                    productId
            );
            if (currentStock == null) currentStock = BigDecimal.ZERO;
            if (currentStock.compareTo(rQty) < 0) {
                throw new RuntimeException("Insufficient stock (" + currentStock.toPlainString() + ")");
            }
            jdbcTemplate.update("UPDATE prod_batch SET stock = GREATEST(0, stock - ?) WHERE product_id = ?", rQty, productId);
            jdbcTemplate.update("UPDATE prod_stock_totals SET stock = stock - ? WHERE prods_id = ?", rQty, productId);
            BigDecimal prevNow = jdbcTemplate.query(
                    "SELECT IFNULL(stock_now,0) FROM prod_lifecycle WHERE product_id = ? ORDER BY id DESC LIMIT 1",
                    rs -> rs.next() ? rs.getBigDecimal(1) : BigDecimal.ZERO,
                    productId
            );
            if (prevNow == null) prevNow = BigDecimal.ZERO;
            jdbcTemplate.update(
                    "INSERT INTO prod_lifecycle(batch_id, product_id, stock_out, stock_now, is_zero_stock_bill, notes, uid, stock_type, DATE, TIME) " +
                            "VALUES(1,?,?,?,2,?,?,2,NOW(),NOW())",
                    productId, rQty, prevNow.subtract(rQty), "Stock deducted — Purchase return (" + returnNo + ")", uid
            );
            double lineTotal = BigDecimal.valueOf(item.getQty() * nz(item.getRate())).setScale(3, RoundingMode.HALF_UP).doubleValue();
            grand += lineTotal;
            jdbcTemplate.update(
                    "INSERT INTO prod_purchase_return_details(return_id, purchase_detail_id, product_id, qty, rate, total, uid, date_time) VALUES(?,?,?,?,?,?,?,NOW())",
                    returnId, item.getDetailId(), productId, item.getQty(), nz(item.getRate()), lineTotal, uid
            );
        }
        jdbcTemplate.update("UPDATE prod_purchase_return SET total = ? WHERE id = ?", grand, returnId);
        if (grand > 0 && supplierId != null && supplierId > 0) {
            jdbcTemplate.update(
                    "INSERT INTO prod_ledger (bill_type, bill_id, customer_id, supplier_id, payment_mode, bill_amount, cash_paid, bank_paid, payment_type, uid, date_time) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                    8, returnId, null, supplierId, 1, grand, 0, 0, 0, uid
            );
            jdbcTemplate.update("UPDATE supplier_account SET balance = GREATEST(0, balance - ?) WHERE supplier_id = ?", grand, supplierId);
        }
        return returnNo;
    }

    public List<PurchaseReturnReportRow> returnReport(String from, String to, Long supplierId) {
        StringBuilder sql = new StringBuilder(
                "SELECT pr.id, pr.return_no, pr.purchase_id, pp.prno, IFNULL(d.name,'—') AS supplier_name, pr.total, pr.notes, pr.date_time, IFNULL(u.user_name,'—') AS entered_by " +
                        "FROM prod_purchase_return pr " +
                        "JOIN prod_purchase pp ON pr.purchase_id = pp.id " +
                        "LEFT JOIN prod_supplier d ON pr.supplier_id = d.id " +
                        "LEFT JOIN users u ON pr.uid = u.id " +
                        "WHERE DATE(pr.date_time) BETWEEN ? AND ?"
        );
        List<Object> args = new ArrayList<>();
        args.add(from);
        args.add(to);
        if (supplierId != null && supplierId > 0) {
            sql.append(" AND pr.supplier_id = ?");
            args.add(supplierId);
        }
        sql.append(" ORDER BY pr.date_time DESC");
        return jdbcTemplate.query(sql.toString(), (rs, i) -> {
            PurchaseReturnReportRow row = new PurchaseReturnReportRow();
            row.setId(rs.getLong(1));
            row.setReturnNo(rs.getString(2));
            row.setPurchaseId(rs.getLong(3));
            row.setPrno(rs.getString(4));
            row.setSupplierName(rs.getString(5));
            row.setTotal(rs.getDouble(6));
            row.setNotes(rs.getString(7));
            row.setDateTime(rs.getString(8));
            row.setEnteredBy(rs.getString(9));
            return row;
        }, args.toArray());
    }

    public List<PurchaseReturnHistoryRow> returnHistory(Long detailId) {
        return jdbcTemplate.query(
                "SELECT pr.return_no, prd.qty, prd.rate, prd.total, IFNULL(pr.notes,''), pr.date_time, IFNULL(u.user_name,'—') " +
                        "FROM prod_purchase_return_details prd " +
                        "JOIN prod_purchase_return pr ON prd.return_id = pr.id " +
                        "LEFT JOIN users u ON pr.uid = u.id " +
                        "WHERE prd.purchase_detail_id = ? ORDER BY pr.date_time DESC",
                (rs, i) -> {
                    PurchaseReturnHistoryRow row = new PurchaseReturnHistoryRow();
                    row.setReturnNo(rs.getString(1));
                    row.setQty(rs.getDouble(2));
                    row.setRate(rs.getDouble(3));
                    row.setTotal(rs.getDouble(4));
                    row.setNotes(rs.getString(5));
                    row.setDateTime(rs.getString(6));
                    row.setEnteredBy(rs.getString(7));
                    return row;
                },
                detailId
        );
    }

    public List<SupplierPaymentRow> supplierPaymentReport(String from, String to, Long supplierId) {
        StringBuilder sql = new StringBuilder(
                "SELECT sp.id, p.ent_date as pay_date, p.prno, s.name as supplier_name, sp.total, sp.paid, sp.balance " +
                        "FROM prod_purchase_supplier_payment sp " +
                        "INNER JOIN prod_supplier s ON sp.deal_id = s.id " +
                        "INNER JOIN prod_purchase p ON sp.prid = p.id " +
                        "WHERE p.ent_date BETWEEN ? AND ? "
        );
        List<Object> args = new ArrayList<>();
        args.add(from);
        args.add(to);
        if (supplierId != null && supplierId > 0) {
            sql.append("AND sp.deal_id = ? ");
            args.add(supplierId);
        }
        sql.append("ORDER BY p.ent_date DESC, sp.id DESC");
        return jdbcTemplate.query(sql.toString(), (rs, i) -> {
            SupplierPaymentRow row = new SupplierPaymentRow();
            row.setId(rs.getLong("id"));
            row.setDate(rs.getString("pay_date"));
            row.setPrno(rs.getString("prno"));
            row.setSupplierName(rs.getString("supplier_name"));
            row.setTotal(rs.getDouble("total"));
            row.setPaid(rs.getDouble("paid"));
            row.setBalance(rs.getDouble("balance"));
            return row;
        }, args.toArray());
    }

    private void addDueToSupplier(Long supplierId, double due) {
        int rows = jdbcTemplate.update("UPDATE supplier_account SET balance = balance + ? WHERE supplier_id = ?", due, supplierId);
        if (rows == 0) {
            jdbcTemplate.update("INSERT INTO supplier_account (supplier_id, advance, balance) VALUES (?, 0.00, ?)", supplierId, due);
        }
    }

    private long resolveProductId(PurchaseLineRequest line) {
        if (line.getProductId() != null && line.getProductId() > 0) {
            return line.getProductId();
        }
        List<Long> ids = jdbcTemplate.query("SELECT id FROM prod_product WHERE NAME =?", (rs, i) -> rs.getLong(1), line.getName());
        if (ids.isEmpty()) {
            throw new RuntimeException("Product not found: " + line.getName());
        }
        return ids.get(0);
    }

    private String productSql(String where) {
        return "SELECT a.id, a.name, COALESCE(a.code,'') AS code, b.name AS catName, c.name AS brandName, d.cost, d.mrp, d.id AS batchId, " +
                "COALESCE(u.name,'') AS unitName, COALESCE(u.convertion_unit,'') AS convertion_unit, " +
                "COALESCE(u.convertion_calculation,1) AS convertion_calculation, COALESCE(a.gst,0) AS gst " +
                "FROM prod_product a JOIN prod_category b ON a.category_id=b.id JOIN prod_brands c ON a.brand_id=c.id " +
                "JOIN prod_batch d ON a.id=d.product_id LEFT JOIN prod_units u ON u.id=a.unit_id WHERE " + where;
    }

    private PurchaseProductData mapProduct(java.sql.ResultSet rs, int i) throws java.sql.SQLException {
        PurchaseProductData row = new PurchaseProductData();
        row.setId(rs.getLong("id"));
        row.setName(rs.getString("name"));
        row.setCode(rs.getString("code"));
        row.setCategoryName(rs.getString("catName"));
        row.setBrandName(rs.getString("brandName"));
        row.setCost(rs.getDouble("cost"));
        row.setMrp(rs.getDouble("mrp"));
        row.setBatchId(rs.getLong("batchId"));
        row.setUnitName(rs.getString("unitName"));
        row.setConvertionUnit(rs.getString("convertion_unit"));
        row.setConvertionCalculation(rs.getDouble("convertion_calculation"));
        row.setGst(rs.getInt("gst"));
        return row;
    }

    private SupplierData mapSupplier(java.sql.ResultSet rs, int i) throws java.sql.SQLException {
        SupplierData row = new SupplierData();
        row.setId(rs.getLong("id"));
        row.setName(rs.getString("name"));
        row.setDescription(rs.getString("description"));
        row.setPhone(rs.getString("phone_number"));
        row.setGstin(rs.getString("gstin"));
        row.setIsGst(rs.getInt("is_gst"));
        return row;
    }

    private NamedItemData mapNamed(java.sql.ResultSet rs, int i) throws java.sql.SQLException {
        NamedItemData row = new NamedItemData();
        row.setId(rs.getLong("id"));
        row.setName(rs.getString("name"));
        return row;
    }

    private boolean nameExists(String name, Long excludeId) {
        List<Long> ids = excludeId != null && excludeId > 0
                ? jdbcTemplate.query("SELECT id FROM prod_supplier WHERE name = ? AND id != ?", (rs, i) -> rs.getLong(1), name, excludeId)
                : jdbcTemplate.query("SELECT id FROM prod_supplier WHERE name = ?", (rs, i) -> rs.getLong(1), name);
        return !ids.isEmpty();
    }

    private String required(String value, String message) {
        if (value == null || value.isBlank()) throw new RuntimeException(message);
        return value.trim();
    }

    private String nz(String value) {
        return value == null ? "" : value.trim();
    }

    private double nz(Double value) {
        return value == null ? 0 : value;
    }

    private long requireGeneratedId(KeyHolder keyHolder) {
        Number key = keyHolder.getKey();
        if (key == null) throw new RuntimeException("Failed to create record");
        return key.longValue();
    }
}
