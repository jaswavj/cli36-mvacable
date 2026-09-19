package com.billing.master;

import com.billing.master.dto.BarcodeItemData;
import com.billing.master.dto.BulkProductData;
import com.billing.master.dto.BulkUpdateItem;
import com.billing.master.dto.CafeTableData;
import com.billing.master.dto.ComponentData;
import com.billing.master.dto.ComponentSaveRequest;
import com.billing.master.dto.CustomerMasterData;
import com.billing.master.dto.CustomerSaveRequest;
import com.billing.master.dto.HeadingData;
import com.billing.master.dto.MasterLookupsData;
import com.billing.master.dto.NameSaveRequest;
import com.billing.master.dto.NamedItemData;
import com.billing.master.dto.ProductMasterData;
import com.billing.master.dto.ProductOptionData;
import com.billing.master.dto.ProductSaveRequest;
import com.billing.master.dto.StockAdjustRequest;
import com.billing.master.dto.StockProductData;
import com.billing.master.dto.UnitData;
import com.billing.master.dto.UnitSaveRequest;
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
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MasterService {

    private final JdbcTemplate jdbcTemplate;

    public HeadingData headings() {
        HeadingData data = new HeadingData();
        try {
            List<HeadingData> rows = jdbcTemplate.query(
                    "SELECT head1, head2, head3 FROM heading LIMIT 1",
                    (rs, i) -> {
                        HeadingData row = new HeadingData();
                        if (rs.getString("head1") != null) row.setHead1(rs.getString("head1"));
                        if (rs.getString("head2") != null) row.setHead2(rs.getString("head2"));
                        if (rs.getString("head3") != null) row.setHead3(rs.getString("head3"));
                        return row;
                    }
            );
            if (!rows.isEmpty()) {
                return rows.get(0);
            }
        } catch (Exception ignored) {
            // keep defaults
        }
        return data;
    }

    public MasterLookupsData lookups() {
        MasterLookupsData data = new MasterLookupsData();
        data.setHeadings(headings());
        data.setCategories(categories());
        data.setBrands(brands());
        data.setUnits(activeUnits());
        data.setProducts(productOptions());
        return data;
    }

    public List<NamedItemData> categories() {
        return jdbcTemplate.query(
                "SELECT id, NAME AS name FROM prod_category WHERE is_active = 1 ORDER BY NAME",
                this::mapNamed
        );
    }

    @Transactional
    public void saveCategory(NameSaveRequest request) {
        String name = requiredName(request.getName(), "Category name is required");
        if (nameExists("prod_category", name, request.getId())) {
            throw new RuntimeException("Object name already exists!");
        }
        if (request.getId() != null && request.getId() > 0) {
            jdbcTemplate.update("UPDATE prod_category SET name = ? WHERE id = ?", name, request.getId());
        } else {
            jdbcTemplate.update("INSERT INTO prod_category(NAME, date, time) VALUES (?, NOW(), NOW())", name);
        }
    }

    @Transactional
    public void blockCategory(Long id) {
        jdbcTemplate.update("UPDATE prod_category SET is_active = 0 WHERE id = ?", id);
    }

    public List<NamedItemData> brands() {
        return jdbcTemplate.query(
                "SELECT id, NAME AS name FROM prod_brands WHERE is_active = 1 ORDER BY NAME",
                this::mapNamed
        );
    }

    @Transactional
    public void saveBrand(NameSaveRequest request) {
        String name = requiredName(request.getName(), "Brand name is required");
        if (nameExists("prod_brands", name, request.getId())) {
            throw new RuntimeException("Brand name already exists!");
        }
        if (request.getId() != null && request.getId() > 0) {
            jdbcTemplate.update("UPDATE prod_brands SET name = ? WHERE id = ?", name, request.getId());
        } else {
            jdbcTemplate.update("INSERT INTO prod_brands(NAME, date, time) VALUES (?, NOW(), NOW())", name);
        }
    }

    @Transactional
    public void blockBrand(Long id) {
        jdbcTemplate.update("UPDATE prod_brands SET is_active = 0 WHERE id = ?", id);
    }

    public List<UnitData> units() {
        return jdbcTemplate.query(
                "SELECT id, name, convertion_unit, convertion_calculation, is_active FROM prod_units ORDER BY name",
                this::mapUnit
        );
    }

    public List<UnitData> activeUnits() {
        return jdbcTemplate.query(
                "SELECT id, name, convertion_unit, convertion_calculation, is_active FROM prod_units WHERE is_active = 1 ORDER BY name",
                this::mapUnit
        );
    }

    @Transactional
    public void saveUnit(UnitSaveRequest request) {
        String name = requiredName(request.getName(), "Unit name is required");
        String convertionUnit = blankToNull(request.getConvertionUnit());
        Double calc = request.getConvertionCalculation();
        if (request.getId() != null && request.getId() > 0) {
            jdbcTemplate.update(
                    "UPDATE prod_units SET name = ?, convertion_unit = ?, convertion_calculation = ? WHERE id = ?",
                    name, convertionUnit, calc, request.getId()
            );
        } else {
            jdbcTemplate.update(
                    "INSERT INTO prod_units(name, convertion_unit, convertion_calculation, is_active) VALUES (?, ?, ?, 1)",
                    name, convertionUnit, calc
            );
        }
    }

    @Transactional
    public void updateUnitStatus(Long id, int isActive) {
        jdbcTemplate.update("UPDATE prod_units SET is_active = ? WHERE id = ?", isActive, id);
    }

    public List<CustomerMasterData> customers() {
        return jdbcTemplate.query(
                "SELECT id, name, " +
                        "CASE WHEN address = '' OR address IS NULL THEN '-' ELSE address END AS address, " +
                        "CASE WHEN phone_number = '' OR phone_number IS NULL THEN '-' ELSE phone_number END AS phone_number, " +
                        "CASE WHEN gstin = '' OR gstin IS NULL THEN '-' ELSE gstin END AS gstin, " +
                        "COALESCE(is_gst, 0) AS is_gst, COALESCE(is_eligible_for_commission, 0) AS is_eligible_for_commission " +
                        "FROM customers WHERE is_active = 1 ORDER BY name",
                (rs, i) -> {
                    CustomerMasterData row = new CustomerMasterData();
                    row.setId(rs.getLong("id"));
                    row.setName(rs.getString("name"));
                    row.setAddress(rs.getString("address"));
                    row.setPhone(rs.getString("phone_number"));
                    row.setGstin(rs.getString("gstin"));
                    row.setIsGst(rs.getInt("is_gst"));
                    row.setIsEligibleForCommission(rs.getInt("is_eligible_for_commission"));
                    return row;
                }
        );
    }

    @Transactional
    public void saveCustomer(CustomerSaveRequest request) {
        String name = requiredName(request.getName(), "Customer name is required");
        if (customerNameExists(name, request.getId())) {
            throw new RuntimeException("Customer name already exists");
        }
        String phone = nz(request.getPhone());
        String address = nz(request.getAddress());
        String gstin = nz(request.getGstin());
        int isGst = request.getIsGst() == null ? 0 : request.getIsGst();
        int commission = request.getIsEligibleForCommission() == null ? 0 : request.getIsEligibleForCommission();
        if (request.getId() != null && request.getId() > 0) {
            jdbcTemplate.update(
                    "UPDATE customers SET name=?, phone_number=?, address=?, gstin=?, is_gst=?, is_eligible_for_commission=? WHERE id=?",
                    name, phone, address, gstin, isGst, commission, request.getId()
            );
        } else {
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(con -> {
                PreparedStatement ps = con.prepareStatement(
                        "INSERT INTO customers(name, date, time, address, phone_number, gstin, is_gst, is_eligible_for_commission) VALUES (?, NOW(), NOW(), ?, ?, ?, ?, ?)",
                        Statement.RETURN_GENERATED_KEYS
                );
                ps.setString(1, name);
                ps.setString(2, address);
                ps.setString(3, phone);
                ps.setString(4, gstin);
                ps.setInt(5, isGst);
                ps.setInt(6, commission);
                return ps;
            }, keyHolder);
            long customerId = requireGeneratedId(keyHolder);
            jdbcTemplate.update("INSERT INTO customer_account(customer_id, advance, balance) VALUES (?, 0.00, 0.00)", customerId);
        }
    }

    @Transactional
    public void blockCustomer(Long id) {
        jdbcTemplate.update("UPDATE customers SET is_active = 0 WHERE id = ?", id);
    }

    public List<ProductMasterData> products() {
        return jdbcTemplate.query(
                "SELECT a.id, a.name, a.code, b.name AS category_name, c.name AS brand_name, d.mrp, " +
                        "CASE WHEN d.disc_type = 1 THEN CONCAT(CAST(d.discount AS UNSIGNED), ' RS') " +
                        "WHEN d.disc_type = 2 THEN CONCAT(CAST(d.discount AS UNSIGNED), ' %') ELSE 'No Discount' END AS discount_display, " +
                        "d.stock, d.added_stock, d.cost, d.disc_type, d.discount, a.gst, a.unit_id, a.hsn, e.name AS unit_name, d.commission, " +
                        "a.category_id, a.brand_id " +
                        "FROM prod_product a " +
                        "JOIN prod_category b ON a.category_id = b.id " +
                        "JOIN prod_brands c ON a.brand_id = c.id " +
                        "JOIN prod_batch d ON a.id = d.product_id " +
                        "LEFT JOIN prod_units e ON a.unit_id = e.id " +
                        "WHERE a.is_active = 1 ORDER BY CAST(SUBSTRING(a.code, 2) AS UNSIGNED)",
                (rs, i) -> {
                    ProductMasterData row = new ProductMasterData();
                    row.setId(rs.getLong("id"));
                    row.setName(rs.getString("name"));
                    row.setCode(rs.getString("code"));
                    row.setCategoryName(rs.getString("category_name"));
                    row.setBrandName(rs.getString("brand_name"));
                    row.setMrp(rs.getDouble("mrp"));
                    row.setDiscountDisplay(rs.getString("discount_display"));
                    row.setStock(rs.getDouble("stock"));
                    row.setAddedStock(rs.getDouble("added_stock"));
                    row.setCost(rs.getDouble("cost"));
                    row.setDiscType(rs.getInt("disc_type"));
                    row.setDiscount(rs.getDouble("discount"));
                    row.setGst(rs.getInt("gst"));
                    row.setUnitId(rs.getLong("unit_id"));
                    row.setHsn(rs.getString("hsn"));
                    row.setUnitName(rs.getString("unit_name"));
                    row.setCommission(rs.getDouble("commission"));
                    row.setCategoryId(rs.getLong("category_id"));
                    row.setBrandId(rs.getLong("brand_id"));
                    return row;
                }
        );
    }

    public List<ProductOptionData> productOptions() {
        return jdbcTemplate.query(
                "SELECT id, NAME AS name, code FROM prod_product WHERE is_active = 1 ORDER BY NAME",
                (rs, i) -> {
                    ProductOptionData row = new ProductOptionData();
                    row.setId(rs.getLong("id"));
                    row.setName(rs.getString("name"));
                    row.setCode(rs.getString("code"));
                    return row;
                }
        );
    }

    @Transactional
    public void saveProduct(ProductSaveRequest request, Long uid) {
        String name = requiredName(request.getName(), "Product name is required");
        if (request.getCategoryId() == null || request.getCategoryId() <= 0) {
            throw new RuntimeException("Category is required");
        }
        if (request.getBrandId() == null || request.getBrandId() <= 0) {
            throw new RuntimeException("Brand is required");
        }
        if (request.getUnitId() == null || request.getUnitId() <= 0) {
            throw new RuntimeException("Unit is required");
        }
        String code = request.getCode() == null || request.getCode().isBlank() ? "0" : request.getCode().trim();
        double costValue = nz(request.getCost());
        double mrpValue = nz(request.getMrp());
        double commissionValue = nz(request.getCommission());
        int discType = request.getDiscType() == null ? 0 : request.getDiscType();
        double discount = nz(request.getDiscount());
        int gst = request.getGst() == null ? 0 : request.getGst();
        BigDecimal stockValue = BigDecimal.valueOf(nz(request.getStock()));

        UnitData unit = unitById(request.getUnitId());
        BigDecimal convertion = unit != null && unit.getConvertionCalculation() != null
                ? BigDecimal.valueOf(unit.getConvertionCalculation())
                : BigDecimal.ZERO;
        if (convertion.compareTo(BigDecimal.ZERO) > 0) {
            stockValue = stockValue.multiply(convertion);
            costValue = BigDecimal.valueOf(costValue).divide(convertion, 6, RoundingMode.HALF_UP).doubleValue();
            mrpValue = BigDecimal.valueOf(mrpValue).divide(convertion, 6, RoundingMode.HALF_UP).doubleValue();
            commissionValue = BigDecimal.valueOf(commissionValue).divide(convertion, 6, RoundingMode.HALF_UP).doubleValue();
        }
        final double cost = costValue;
        final double mrp = mrpValue;
        final double commission = commissionValue;
        final BigDecimal stock = stockValue;

        Object hsnValue = parseHsn(request.getHsn());
        if (request.getId() != null && request.getId() > 0) {
            jdbcTemplate.update(
                    "UPDATE prod_product SET name=?, code=?, category_id=?, brand_id=?, gst=?, unit_id=?, hsn=? WHERE id=?",
                    name, code, request.getCategoryId(), request.getBrandId(), gst, request.getUnitId(), hsnValue, request.getId()
            );
            archiveBatch(request.getId(), uid);
            jdbcTemplate.update(
                    "UPDATE prod_batch SET name = CONCAT('Z', ?), cost=?, mrp=?, disc_type=?, discount=?, commission=? WHERE product_id=?",
                    code, cost, mrp, discType, discount, commission, request.getId()
            );
        } else {
            KeyHolder productKeys = new GeneratedKeyHolder();
            jdbcTemplate.update(con -> {
                PreparedStatement ps = con.prepareStatement(
                        "INSERT INTO prod_product(NAME, category_id, brand_id, DATE, TIME, code, uid, gst, unit_id, hsn) VALUES (?, ?, ?, NOW(), NOW(), ?, ?, ?, ?, ?)",
                        Statement.RETURN_GENERATED_KEYS
                );
                ps.setString(1, name);
                ps.setLong(2, request.getCategoryId());
                ps.setLong(3, request.getBrandId());
                ps.setString(4, code);
                ps.setLong(5, uid);
                ps.setInt(6, gst);
                ps.setLong(7, request.getUnitId());
                if (hsnValue == null) {
                    ps.setNull(8, Types.INTEGER);
                } else {
                    ps.setInt(8, (Integer) hsnValue);
                }
                return ps;
            }, productKeys);
            long productId = requireGeneratedId(productKeys);

            KeyHolder batchKeys = new GeneratedKeyHolder();
            jdbcTemplate.update(con -> {
                PreparedStatement ps = con.prepareStatement(
                        "INSERT INTO prod_batch (NAME, product_id, cost, mrp, stock, disc_type, discount, DATE, TIME, added_stock, uid, commission) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?)",
                        Statement.RETURN_GENERATED_KEYS
                );
                ps.setString(1, "Z" + code);
                ps.setLong(2, productId);
                ps.setDouble(3, cost);
                ps.setDouble(4, mrp);
                ps.setBigDecimal(5, stock);
                ps.setInt(6, discType);
                ps.setDouble(7, discount);
                ps.setBigDecimal(8, stock);
                ps.setLong(9, uid);
                ps.setDouble(10, commission);
                return ps;
            }, batchKeys);
            long batchId = requireGeneratedId(batchKeys);
            jdbcTemplate.update(
                    "INSERT INTO prod_lifecycle (batch_id, stock_in, stock_now, notes, DATE, TIME, product_id, uid) VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?)",
                    batchId, stock, stock, "WHILE ADD PRODUCT", productId, uid
            );
        }
    }

    @Transactional
    public void blockProduct(Long id) {
        jdbcTemplate.update("UPDATE prod_product SET is_active = 0 WHERE id = ?", id);
    }

    public List<StockProductData> stockProducts() {
        return jdbcTemplate.query(
                "SELECT a.id, a.name, a.code, b.name AS category_name, c.name AS brand_name, d.stock, d.id AS batch_id, " +
                        "IFNULL(e.name, '') AS unit_name, IFNULL(e.convertion_unit, '') AS convertion_unit, " +
                        "IFNULL(e.convertion_calculation, 0) AS convertion_calculation " +
                        "FROM prod_product a " +
                        "JOIN prod_category b ON a.category_id = b.id " +
                        "JOIN prod_brands c ON a.brand_id = c.id " +
                        "JOIN prod_batch d ON a.id = d.product_id " +
                        "LEFT JOIN prod_units e ON a.unit_id = e.id " +
                        "WHERE a.is_active = 1 ORDER BY a.name",
                (rs, i) -> {
                    StockProductData row = new StockProductData();
                    row.setId(rs.getLong("id"));
                    row.setName(rs.getString("name"));
                    row.setCode(rs.getString("code"));
                    row.setCategoryName(rs.getString("category_name"));
                    row.setBrandName(rs.getString("brand_name"));
                    row.setStock(rs.getDouble("stock"));
                    row.setBatchId(rs.getLong("batch_id"));
                    row.setUnitName(rs.getString("unit_name"));
                    row.setConvertionUnit(rs.getString("convertion_unit"));
                    row.setConvertionCalculation(rs.getDouble("convertion_calculation"));
                    return row;
                }
        );
    }

    @Transactional
    public void adjustStock(StockAdjustRequest request, Long uid) {
        if (request.getProductId() == null || request.getBatchId() == null) {
            throw new RuntimeException("Select a product first");
        }
        int type = request.getType() == null ? 0 : request.getType();
        if (type < 1 || type > 4) {
            throw new RuntimeException("Choose the stock action type");
        }
        BigDecimal qty = BigDecimal.valueOf(nz(request.getQuantity()));
        if (qty.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Quantity must be greater than 0");
        }
        String reason = request.getReason() == null ? "" : request.getReason().trim();
        if (reason.isEmpty()) {
            throw new RuntimeException("Reason is required");
        }
        String category = request.getReasonCategory() == null ? "" : request.getReasonCategory().trim();
        if ((type == 3 || type == 4) && !category.isEmpty()) {
            reason = "[" + category + "] " + reason;
        }

        Double convertion = jdbcTemplate.query(
                "SELECT IFNULL(u.convertion_calculation, 0) FROM prod_product p LEFT JOIN prod_units u ON u.id = p.unit_id WHERE p.id = ?",
                rs -> rs.next() ? rs.getDouble(1) : 0d,
                request.getProductId()
        );
        if (convertion != null && convertion > 0) {
            qty = qty.multiply(BigDecimal.valueOf(convertion));
        }

        if (type == 1) {
            jdbcTemplate.update("UPDATE prod_batch SET stock = stock + ? WHERE id = ?", qty, request.getBatchId());
        } else {
            jdbcTemplate.update("UPDATE prod_batch SET stock = stock - ? WHERE id = ?", qty, request.getBatchId());
        }
        BigDecimal stockNow = jdbcTemplate.query(
                "SELECT stock FROM prod_batch WHERE id = ?",
                rs -> rs.next() ? rs.getBigDecimal(1) : BigDecimal.ZERO,
                request.getBatchId()
        );
        if (stockNow == null) stockNow = BigDecimal.ZERO;

        String notes;
        int adjType;
        if (type == 1) {
            notes = "Adding Stock - " + reason;
            adjType = 1;
            jdbcTemplate.update(
                    "INSERT INTO prod_lifecycle (batch_id, stock_in, stock_now, notes, DATE, TIME, product_id, uid, stockAdjType) VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?, ?)",
                    request.getBatchId(), qty, stockNow, notes, request.getProductId(), uid, adjType
            );
        } else {
            if (type == 2) {
                notes = "Removing Stock - " + reason;
                adjType = 2;
            } else if (type == 3) {
                notes = "Damage - " + reason;
                adjType = 3;
            } else {
                notes = "Internal Use - " + reason;
                adjType = 4;
            }
            jdbcTemplate.update(
                    "INSERT INTO prod_lifecycle (batch_id, stock_out, stock_now, notes, DATE, TIME, product_id, uid, stockAdjType) VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?, ?)",
                    request.getBatchId(), qty, stockNow, notes, request.getProductId(), uid, adjType
            );
        }
        jdbcTemplate.update(
                "INSERT INTO prod_stock_adjustment (product_id, batch_id, stockType, stock, DATE, TIME, notes, uid) VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?)",
                request.getProductId(), request.getBatchId(), type, qty, notes, uid
        );
    }

    public List<ComponentData> components(Long productId) {
        return jdbcTemplate.query(
                "SELECT c.id, p.name, p.code, c.quantity, p.id AS comp_prod_id " +
                        "FROM prod_product_components c " +
                        "JOIN prod_product p ON c.component_product_id = p.id " +
                        "WHERE c.product_id = ? AND p.is_active = 1",
                (rs, i) -> {
                    ComponentData row = new ComponentData();
                    row.setId(rs.getLong("id"));
                    row.setName(rs.getString("name"));
                    row.setCode(rs.getString("code"));
                    row.setQuantity(rs.getDouble("quantity"));
                    row.setComponentProductId(rs.getLong("comp_prod_id"));
                    return row;
                },
                productId
        );
    }

    @Transactional
    public void saveComponent(ComponentSaveRequest request, Long uid) {
        if (request.getProductId() == null || request.getComponentProductId() == null) {
            throw new RuntimeException("Select main product and component");
        }
        if (request.getProductId().equals(request.getComponentProductId())) {
            throw new RuntimeException("Main product and component cannot be the same");
        }
        double qty = nz(request.getQuantity());
        if (qty <= 0) {
            throw new RuntimeException("Quantity must be greater than 0");
        }
        jdbcTemplate.update(
                "INSERT INTO prod_product_components (product_id, component_product_id, quantity, created_by) VALUES (?, ?, ?, ?)",
                request.getProductId(), request.getComponentProductId(), qty, uid
        );
    }

    @Transactional
    public void deleteComponent(Long id) {
        jdbcTemplate.update("DELETE FROM prod_product_components WHERE id = ?", id);
    }

    public List<CafeTableData> cafeTables() {
        return jdbcTemplate.query(
                "SELECT id, name, is_occupied FROM order_tables ORDER BY name",
                (rs, i) -> {
                    CafeTableData row = new CafeTableData();
                    row.setId(rs.getLong("id"));
                    row.setName(rs.getString("name"));
                    row.setIsOccupied(rs.getInt("is_occupied"));
                    return row;
                }
        );
    }

    @Transactional
    public void saveCafeTable(NameSaveRequest request) {
        String name = requiredName(request.getName(), "Table name is required");
        if (request.getId() != null && request.getId() > 0) {
            jdbcTemplate.update("UPDATE order_tables SET name = ? WHERE id = ?", name, request.getId());
        } else {
            jdbcTemplate.update("INSERT INTO order_tables (name, is_occupied) VALUES (?, 0)", name);
        }
    }

    @Transactional
    public void deleteCafeTable(Long id) {
        jdbcTemplate.update("DELETE FROM order_tables WHERE id = ?", id);
    }

    public List<BulkProductData> bulkProducts(String name, Long categoryId) {
        StringBuilder sql = new StringBuilder(
                "SELECT p.id, p.name, p.code, p.gst, c.name AS category_name, b.mrp, b.id AS batch_id, b.cost, br.name AS brand_name " +
                        "FROM prod_product p " +
                        "JOIN prod_category c ON p.category_id = c.id " +
                        "JOIN prod_brands br ON p.brand_id = br.id " +
                        "JOIN prod_batch b ON b.product_id = p.id " +
                        "WHERE p.is_active = 1 "
        );
        List<Object> args = new ArrayList<>();
        if (name != null && !name.isBlank()) {
            sql.append("AND p.name LIKE ? ");
            args.add("%" + name.trim() + "%");
        }
        if (categoryId != null && categoryId > 0) {
            sql.append("AND p.category_id = ? ");
            args.add(categoryId);
        }
        sql.append("ORDER BY p.name");
        return jdbcTemplate.query(sql.toString(), (rs, i) -> {
            BulkProductData row = new BulkProductData();
            row.setId(rs.getLong("id"));
            row.setName(rs.getString("name"));
            row.setCode(rs.getString("code"));
            row.setGst(rs.getInt("gst"));
            row.setCategoryName(rs.getString("category_name"));
            row.setMrp(rs.getDouble("mrp"));
            row.setBatchId(rs.getLong("batch_id"));
            row.setCost(rs.getDouble("cost"));
            row.setBrandName(rs.getString("brand_name"));
            return row;
        }, args.toArray());
    }

    @Transactional
    public int bulkUpdate(List<BulkUpdateItem> items) {
        if (items == null || items.isEmpty()) {
            throw new RuntimeException("No products to update");
        }
        int updated = 0;
        for (BulkUpdateItem item : items) {
            if (item.getProductId() == null || item.getBatchId() == null) continue;
            int r1 = jdbcTemplate.update(
                    "UPDATE prod_product SET gst = ?, code = ? WHERE id = ?",
                    item.getGst() == null ? 0 : item.getGst(),
                    item.getCode() == null ? "" : item.getCode(),
                    item.getProductId()
            );
            int r2 = jdbcTemplate.update(
                    "UPDATE prod_batch SET cost = ?, mrp = ? WHERE id = ?",
                    nz(item.getCost()), nz(item.getMrp()), item.getBatchId()
            );
            if (r1 > 0 && r2 > 0) updated++;
        }
        return updated;
    }

    public List<BarcodeItemData> barcodes() {
        return jdbcTemplate.query(
                "SELECT p.id, p.name, p.code, COALESCE(MAX(b.mrp), 0) AS mrp, COALESCE(u.name, 'N/A') AS unit " +
                        "FROM prod_product p " +
                        "LEFT JOIN prod_batch b ON p.id = b.product_id " +
                        "LEFT JOIN prod_units u ON p.unit_id = u.id " +
                        "WHERE p.is_active = 1 " +
                        "GROUP BY p.id, p.name, p.code, u.name " +
                        "ORDER BY p.name",
                (rs, i) -> {
                    BarcodeItemData row = new BarcodeItemData();
                    row.setId(rs.getLong("id"));
                    row.setName(rs.getString("name"));
                    row.setCode(rs.getString("code"));
                    row.setMrp(rs.getDouble("mrp"));
                    row.setUnit(rs.getString("unit"));
                    return row;
                }
        );
    }

    private void archiveBatch(Long productId, Long uid) {
        List<Object[]> batches = jdbcTemplate.query(
                "SELECT product_id, name, cost, mrp, disc_type, discount, stock, added_stock FROM prod_batch WHERE product_id = ? LIMIT 1",
                (rs, i) -> new Object[]{
                        rs.getInt("product_id"),
                        rs.getString("name"),
                        rs.getDouble("cost"),
                        rs.getDouble("mrp"),
                        rs.getInt("disc_type"),
                        rs.getDouble("discount"),
                        rs.getBigDecimal("stock"),
                        rs.getBigDecimal("added_stock"),
                        uid
                },
                productId
        );
        for (Object[] batch : batches) {
            jdbcTemplate.update(
                    "INSERT INTO prod_batch_updated (product_id, name, cost, mrp, disc_type, discount, stock, added_stock, updatedUid, updatedDate, updatedTime) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
                    batch
            );
        }
    }

    private UnitData unitById(Long id) {
        List<UnitData> rows = jdbcTemplate.query(
                "SELECT id, name, convertion_unit, convertion_calculation, is_active FROM prod_units WHERE id = ?",
                this::mapUnit,
                id
        );
        return rows.isEmpty() ? null : rows.get(0);
    }

    private NamedItemData mapNamed(java.sql.ResultSet rs, int i) throws java.sql.SQLException {
        NamedItemData row = new NamedItemData();
        row.setId(rs.getLong("id"));
        row.setName(rs.getString("name"));
        return row;
    }

    private UnitData mapUnit(java.sql.ResultSet rs, int i) throws java.sql.SQLException {
        UnitData row = new UnitData();
        row.setId(rs.getLong("id"));
        row.setName(rs.getString("name"));
        row.setConvertionUnit(rs.getString("convertion_unit"));
        row.setConvertionCalculation(rs.getObject("convertion_calculation") == null ? null : rs.getDouble("convertion_calculation"));
        row.setIsActive(rs.getInt("is_active"));
        return row;
    }

    private boolean nameExists(String table, String name, Long excludeId) {
        String sql = "SELECT id FROM " + table + " WHERE name = ?";
        List<Long> ids = excludeId != null && excludeId > 0
                ? jdbcTemplate.query("SELECT id FROM " + table + " WHERE name = ? AND id != ?", (rs, i) -> rs.getLong(1), name, excludeId)
                : jdbcTemplate.query(sql, (rs, i) -> rs.getLong(1), name);
        return !ids.isEmpty();
    }

    private boolean customerNameExists(String name, Long excludeId) {
        List<Long> ids = excludeId != null && excludeId > 0
                ? jdbcTemplate.query("SELECT id FROM customers WHERE name = ? AND id != ?", (rs, i) -> rs.getLong(1), name, excludeId)
                : jdbcTemplate.query("SELECT id FROM customers WHERE name = ?", (rs, i) -> rs.getLong(1), name);
        return !ids.isEmpty();
    }

    private Object parseHsn(String hsn) {
        if (hsn == null || hsn.isBlank()) return null;
        try {
            return Integer.parseInt(hsn.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private String requiredName(String name, String message) {
        if (name == null || name.isBlank()) {
            throw new RuntimeException(message);
        }
        return name.trim();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String nz(String value) {
        return value == null ? "" : value.trim();
    }

    private double nz(Double value) {
        return value == null ? 0 : value;
    }

    private long requireGeneratedId(KeyHolder keyHolder) {
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new RuntimeException("Failed to create record");
        }
        return key.longValue();
    }
}
