package com.billing.pos;

import com.billing.admin.AdminService;
import com.billing.admin.dto.CompanyDetailsData;
import com.billing.pos.dto.BillingOptionsData;
import com.billing.pos.dto.CustomerData;
import com.billing.pos.dto.PrintBillData;
import com.billing.pos.dto.ProductHistoryData;
import com.billing.pos.dto.ProductLookupData;
import com.billing.pos.dto.QuotationData;
import com.billing.pos.dto.QuotationLineData;
import com.billing.pos.dto.RecentBillData;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BillingReadService {

    private final JdbcTemplate jdbcTemplate;
    private final AdminService adminService;

    public BillingOptionsData options(Long userId) {
        Integer discPer = 100;
        try {
            discPer = jdbcTemplate.queryForObject(
                    "SELECT IFNULL(disc_per, 100) FROM users WHERE id = ?",
                    Integer.class,
                    userId
            );
        } catch (Exception ignored) {
            discPer = 100;
        }
        Integer permCount = 0;
        try {
            permCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM user_special_permission WHERE user_id = ? AND content_id = 1",
                    Integer.class,
                    userId
            );
        } catch (Exception ignored) {
            permCount = 0;
        }
        BillingOptionsData data = new BillingOptionsData();
        data.setDiscPer(discPer == null ? 100 : discPer);
        data.setCanBillWithoutStock(permCount != null && permCount > 0);
        return data;
    }

    public List<String> searchProductNames(String term) {
        String like = "%" + term + "%";
        return jdbcTemplate.query(
                "SELECT name FROM prod_product WHERE is_active = 1 AND (name LIKE ? OR CAST(code AS CHAR) LIKE ?) " +
                        "ORDER BY CASE WHEN CAST(code AS CHAR) = ? THEN 0 WHEN CAST(code AS CHAR) LIKE ? THEN 1 ELSE 2 END, name LIMIT 20",
                (rs, i) -> rs.getString("name"),
                like, like, term, term + "%"
        );
    }

    public ProductLookupData findProductByCode(String code) {
        List<ProductLookupData> rows = jdbcTemplate.query(
                productLookupSql("a.code = ?"),
                this::mapProduct,
                code
        );
        return rows.isEmpty() ? null : withStock(rows.get(0));
    }

    public ProductLookupData findProductByName(String name) {
        List<ProductLookupData> rows = jdbcTemplate.query(
                productLookupSql("a.name = ?"),
                this::mapProduct,
                name
        );
        return rows.isEmpty() ? null : withStock(rows.get(0));
    }

    public Double productStock(Long productId) {
        Double stock = jdbcTemplate.query(
                "SELECT SUM(stock) AS total_stock FROM prod_batch WHERE product_id = ?",
                rs -> rs.next() ? rs.getDouble("total_stock") : 0d,
                productId
        );
        return stock == null ? 0d : stock;
    }

    public List<CustomerData> searchCustomers(String query, String phone) {
        if (phone != null && !phone.isBlank()) {
            return jdbcTemplate.query(
                    customerSql("phone_number LIKE ?"),
                    this::mapCustomer,
                    "%" + phone + "%"
            );
        }
        return jdbcTemplate.query(
                customerSql("name LIKE ?"),
                this::mapCustomer,
                "%" + (query == null ? "" : query) + "%"
        );
    }

    public List<QuotationData> quotationList() {
        return jdbcTemplate.query(
                "SELECT id, bill_display, cusName, cusPhn, payable, date, time " +
                        "FROM prod_quotation WHERE is_cancelled = 0 AND is_billed = 0 " +
                        "ORDER BY date DESC, time DESC",
                (rs, i) -> {
                    QuotationData row = new QuotationData();
                    row.setId(rs.getLong("id"));
                    row.setBillDisplay(rs.getString("bill_display"));
                    row.setCustomerName(rs.getString("cusName"));
                    row.setCustomerPhone(rs.getString("cusPhn"));
                    row.setPayable(rs.getDouble("payable"));
                    row.setDate(String.valueOf(rs.getDate("date")));
                    row.setTime(String.valueOf(rs.getTime("time")));
                    return row;
                }
        );
    }

    public List<QuotationLineData> quotationDetails(Long quotId) {
        return jdbcTemplate.query(
                "SELECT d.prod_id, p.name AS prod_name, p.code, d.qty, d.price, d.disc, d.total, d.gst, " +
                        "IFNULL(b.id, 0) AS batch_id, IFNULL(b.commission, 0) AS commission, IFNULL(u.name, '') AS unit_name " +
                        "FROM prod_quotation_details d " +
                        "JOIN prod_product p ON p.id = d.prod_id " +
                        "LEFT JOIN prod_batch b ON b.product_id = p.id " +
                        "LEFT JOIN prod_units u ON u.id = p.unit_id " +
                        "WHERE d.quot_id = ? AND d.is_cancelled = 0",
                (rs, i) -> {
                    QuotationLineData row = new QuotationLineData();
                    row.setProductId(rs.getLong("prod_id"));
                    row.setName(rs.getString("prod_name"));
                    row.setCode(rs.getString("code"));
                    row.setQty(rs.getDouble("qty"));
                    row.setPrice(rs.getDouble("price"));
                    row.setDiscount(rs.getDouble("disc"));
                    row.setTotal(rs.getDouble("total"));
                    row.setGst(rs.getInt("gst"));
                    row.setBatchId(rs.getLong("batch_id"));
                    row.setCommission(rs.getDouble("commission"));
                    row.setUnitName(rs.getString("unit_name"));
                    return row;
                },
                quotId
        );
    }

    public List<RecentBillData> recentBills() {
        return jdbcTemplate.query(
                "SELECT id, bill_display, total, paid, DATE, TIME, cusName FROM prod_bill " +
                        "WHERE is_cancelled = 0 ORDER BY id DESC LIMIT 50",
                (rs, i) -> {
                    RecentBillData row = new RecentBillData();
                    row.setId(rs.getLong("id"));
                    row.setBillDisplay(rs.getString("bill_display"));
                    row.setTotal(rs.getDouble("total"));
                    row.setPaid(rs.getDouble("paid"));
                    row.setDate(String.valueOf(rs.getDate("DATE")));
                    row.setTime(String.valueOf(rs.getTime("TIME")));
                    row.setCustomerName(rs.getString("cusName"));
                    return row;
                }
        );
    }

    public List<ProductHistoryData> productHistory(Long productId, Long customerId) {
        String sql = "SELECT pb.bill_display, pb.date, pb.time, pbd.qty, pbd.price, pbd.disc, pbd.total, pb.cusName " +
                "FROM prod_bill pb JOIN prod_bill_details pbd ON pb.id = pbd.bill_id " +
                "WHERE pbd.prod_id = ? AND (pb.is_cancelled IS NULL OR pb.is_cancelled = 0) ";
        if (customerId != null && customerId > 0) {
            sql += "AND pb.customerId = ? ";
        }
        sql += "ORDER BY pb.date DESC, pb.time DESC LIMIT 6";
        Object[] args = (customerId != null && customerId > 0)
                ? new Object[]{productId, customerId}
                : new Object[]{productId};
        return jdbcTemplate.query(sql, (rs, i) -> {
            ProductHistoryData row = new ProductHistoryData();
            row.setBillNo(rs.getString("bill_display"));
            row.setDate(String.valueOf(rs.getDate("date")));
            row.setTime(String.valueOf(rs.getTime("time")));
            row.setQty(rs.getDouble("qty"));
            row.setPrice(rs.getDouble("price"));
            row.setDiscount(rs.getDouble("disc"));
            row.setTotal(rs.getDouble("total"));
            row.setCustomerName(rs.getString("cusName"));
            return row;
        }, args);
    }

    public PrintBillData printBill(String billNo) {
        List<PrintBillData> headers = jdbcTemplate.query(
                "SELECT b.id, b.bill_display, b.cusName, b.cusPhn, b.DATE, b.TIME, b.total, b.prodDisc, b.extraDisc, " +
                        "b.payable, b.paid, b.balance, b.paymentMode, b.paymentType, b.is_tax_bill, " +
                        "c.name AS cust_name, c.phone_number, c.address, c.gstin " +
                        "FROM prod_bill b LEFT JOIN customers c ON c.id = b.customerId " +
                        "WHERE b.bill_display = ? AND b.is_cancelled = 0",
                (rs, i) -> {
                    PrintBillData data = new PrintBillData();
                    data.setBillId(rs.getLong("id"));
                    data.setBillDisplay(rs.getString("bill_display"));
                    String custName = nz(rs.getString("cust_name"));
                    data.setCustomerName(custName.isEmpty() ? nz(rs.getString("cusName")) : custName);
                    String phone = nz(rs.getString("phone_number"));
                    data.setCustomerPhone(phone.isEmpty() ? nz(rs.getString("cusPhn")) : phone);
                    data.setCustomerAddress(nz(rs.getString("address")));
                    data.setCustomerGstin(nz(rs.getString("gstin")));
                    data.setDate(String.valueOf(rs.getDate("DATE")));
                    data.setTime(String.valueOf(rs.getTime("TIME")));
                    data.setPriceTotal(rs.getDouble("total"));
                    data.setProductDiscount(rs.getDouble("prodDisc"));
                    data.setExtraDiscount(rs.getDouble("extraDisc"));
                    data.setPayable(rs.getDouble("payable"));
                    data.setPaid(rs.getDouble("paid"));
                    data.setBalance(rs.getDouble("balance"));
                    data.setPaymentMode(rs.getInt("paymentMode"));
                    data.setPaymentType(rs.getInt("paymentType"));
                    data.setIsTaxBill(rs.getInt("is_tax_bill"));
                    return data;
                },
                billNo
        );
        if (headers.isEmpty()) {
            throw new RuntimeException("Bill not found");
        }
        PrintBillData bill = headers.get(0);
        CompanyDetailsData company = adminService.company();
        bill.setPrintType(company.getPrintType() == null ? 1 : company.getPrintType());
        bill.setPrinterName(nz(company.getPrinterName()));
        bill.setCompanyName(nz(company.getShopName()));
        bill.setCompanyAddress(nz(company.getAddress()));
        bill.setCompanyGstin(nz(company.getGstin()));
        bill.setCompanyBankDetails(nz(company.getBankDetails()));
        bill.setAmountInWords(AmountInWords.from(bill.getPaid() == null ? 0 : bill.getPaid()));
        bill.setItems(jdbcTemplate.query(
                "SELECT p.code, p.name, d.qty, d.price, d.disc, d.total, d.gst, " +
                        "IFNULL(cat.name,'') AS category_name, " +
                        "CASE WHEN p.hsn IS NULL OR p.hsn = 0 THEN '' ELSE CAST(p.hsn AS CHAR) END AS hsn, " +
                        "IFNULL(u.name,'') AS unit_name " +
                        "FROM prod_bill_details d JOIN prod_product p ON p.id = d.prod_id " +
                        "JOIN prod_bill b ON b.id = d.bill_id " +
                        "LEFT JOIN prod_category cat ON cat.id = p.category_id " +
                        "LEFT JOIN prod_units u ON u.id = p.unit_id " +
                        "WHERE b.bill_display = ?",
                (rs, i) -> {
                    PrintBillData.PrintLineData line = new PrintBillData.PrintLineData();
                    line.setCode(rs.getString("code"));
                    line.setName(rs.getString("name"));
                    line.setCategoryName(nz(rs.getString("category_name")));
                    line.setHsn(nz(rs.getString("hsn")));
                    line.setUnitName(nz(rs.getString("unit_name")));
                    line.setQty(rs.getDouble("qty"));
                    line.setPrice(rs.getDouble("price"));
                    line.setDiscount(rs.getDouble("disc"));
                    line.setTotal(rs.getDouble("total"));
                    line.setGst(rs.getInt("gst"));
                    return line;
                },
                billNo
        ));
        attachPayments(bill);
        return bill;
    }

    private void attachPayments(PrintBillData bill) {
        double cash = 0;
        double bank = 0;
        List<double[]> amounts = jdbcTemplate.query(
                "SELECT IFNULL(cash,0) AS cash, IFNULL(bank,0) AS bank FROM prod_bill_payment WHERE bill_id = ? LIMIT 1",
                (rs, i) -> new double[]{rs.getDouble("cash"), rs.getDouble("bank")},
                bill.getBillId()
        );
        if (!amounts.isEmpty()) {
            cash = amounts.get(0)[0];
            bank = amounts.get(0)[1];
        }
        bill.setCashPaid(cash);
        bill.setBankPaid(bank);
        List<PrintBillData.PrintPaymentRow> rows = new ArrayList<>();
        PrintBillData.PrintPaymentRow first = new PrintBillData.PrintPaymentRow();
        first.setDate(bill.getDate());
        first.setMode(payModeLabel(bill.getPaymentMode()));
        first.setMethod(payTypeLabel(bill.getPaymentType()));
        first.setPaid(cash + bank);
        double initialBal = (bill.getPayable() == null ? 0 : bill.getPayable()) - (cash + bank);
        first.setBalance(Math.max(0, initialBal));
        rows.add(first);
        try {
            rows.addAll(jdbcTemplate.query(
                    "SELECT a.date, CASE WHEN a.mode=1 THEN 'Cash' ELSE 'Bank' END AS mode_name, " +
                            "CASE WHEN a.bankOption=0 THEN '-' WHEN a.bankOption=1 THEN 'UPI' WHEN a.bankOption=2 THEN 'Debit Card' " +
                            "WHEN a.bankOption=3 THEN 'Credit Card' WHEN a.bankOption=4 THEN 'NEFT' WHEN a.bankOption=5 THEN 'Wallet' ELSE '-' END AS method_name, " +
                            "a.paid, a.finalBalance FROM prod_bill_due_collection a WHERE a.bill_id = ? ORDER BY a.date, a.time",
                    (rs, i) -> {
                        PrintBillData.PrintPaymentRow row = new PrintBillData.PrintPaymentRow();
                        row.setDate(String.valueOf(rs.getDate("date")));
                        row.setMode(nz(rs.getString("mode_name")));
                        row.setMethod(nz(rs.getString("method_name")));
                        row.setPaid(rs.getDouble("paid"));
                        row.setBalance(rs.getDouble("finalBalance"));
                        return row;
                    },
                    bill.getBillId()
            ));
        } catch (Exception ignored) {
            // due collection table may be empty or unavailable
        }
        bill.setPayments(rows);
    }

    private String payModeLabel(Integer mode) {
        if (mode == null) return "-";
        return switch (mode) {
            case 1 -> "Cash";
            case 2 -> "Bank";
            case 3 -> "Cash & Bank";
            default -> "-";
        };
    }

    private String payTypeLabel(Integer type) {
        if (type == null) return "-";
        return switch (type) {
            case 1 -> "UPI";
            case 2 -> "Debit Card";
            case 3 -> "Credit Card";
            case 4 -> "NEFT";
            case 5 -> "Wallet";
            default -> "-";
        };
    }

    private String nz(String value) {
        return value == null ? "" : value.trim();
    }

    private String productLookupSql(String where) {
        return "SELECT a.id, a.code, a.name, b.mrp AS selected_mrp, " +
                "ROUND(CASE WHEN b.disc_type = 1 THEN b.discount " +
                "WHEN b.disc_type = 2 THEN (b.mrp * b.discount) / 100 ELSE 0 END, 2) AS discount_amount, " +
                "b.id AS batch_id, a.unit_id, IFNULL(u.name,'') AS unit_name, IFNULL(b.commission,0) AS commission, " +
                "IFNULL(u.convertion_unit,'') AS convertion_unit " +
                "FROM prod_product a JOIN prod_batch b ON b.product_id = a.id " +
                "LEFT JOIN prod_units u ON u.id = a.unit_id WHERE " + where;
    }

    private ProductLookupData mapProduct(java.sql.ResultSet rs, int i) throws java.sql.SQLException {
        ProductLookupData data = new ProductLookupData();
        data.setId(rs.getLong("id"));
        data.setCode(rs.getString("code"));
        data.setName(rs.getString("name"));
        data.setMrp(rs.getDouble("selected_mrp"));
        data.setDiscount(rs.getDouble("discount_amount"));
        data.setBatchId(rs.getLong("batch_id"));
        data.setUnitId(rs.getLong("unit_id"));
        data.setUnitName(rs.getString("unit_name"));
        data.setCommission(rs.getDouble("commission"));
        data.setConvertionUnit(rs.getString("convertion_unit"));
        return data;
    }

    private ProductLookupData withStock(ProductLookupData data) {
        data.setStock(productStock(data.getId()));
        return data;
    }

    private String customerSql(String where) {
        return "SELECT id, name, " +
                "CASE WHEN phone_number = '' OR phone_number IS NULL THEN '-' ELSE phone_number END AS phone_number, " +
                "CASE WHEN address = '' OR address IS NULL THEN '-' ELSE address END AS address, " +
                "CASE WHEN gstin = '' OR gstin IS NULL THEN '-' ELSE gstin END AS gstin, " +
                "COALESCE(credit_limit, 0) AS credit_limit, COALESCE(is_gst, 0) AS is_gst, " +
                "COALESCE(is_eligible_for_commission, 0) AS is_eligible_for_commission, " +
                "COALESCE(exchange_point, 0) AS exchange_point " +
                "FROM customers WHERE is_active = 1 AND " + where + " ORDER BY name LIMIT 10";
    }

    private CustomerData mapCustomer(java.sql.ResultSet rs, int i) throws java.sql.SQLException {
        CustomerData data = new CustomerData();
        data.setId(rs.getLong("id"));
        data.setName(rs.getString("name"));
        data.setPhone(rs.getString("phone_number"));
        data.setAddress(rs.getString("address"));
        data.setGstin(rs.getString("gstin"));
        data.setCreditLimit(rs.getDouble("credit_limit"));
        data.setIsGst(rs.getInt("is_gst"));
        data.setIsEligibleForCommission(rs.getInt("is_eligible_for_commission"));
        data.setExchangePoint(rs.getDouble("exchange_point"));
        return data;
    }
}
