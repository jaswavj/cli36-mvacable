package com.billing.accountreport;

import com.billing.core.response.ResponseDO;
import com.billing.security.PlatformSecurityContext;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/account-reports")
public class AccountReportController {

    private final AccountReportService accountReportService;
    private final PlatformSecurityContext securityContext;

    @GetMapping("/sales")
    public ResponseDO sales(@RequestParam String from,
                            @RequestParam String to,
                            @RequestParam(required = false, defaultValue = "0") Integer mode,
                            @RequestParam(required = false, defaultValue = "0") Integer type,
                            @RequestParam(required = false, defaultValue = "0") Long userId) {
        return ok(accountReportService.sales(from, to, mode, type, userId));
    }

    @GetMapping("/sales-by-category")
    public ResponseDO salesByCategory(@RequestParam String from,
                                      @RequestParam String to,
                                      @RequestParam Long categoryId) {
        return ok(accountReportService.lineSales(from, to, "category", categoryId));
    }

    @GetMapping("/sales-by-department")
    public ResponseDO salesByDepartment(@RequestParam String from,
                                        @RequestParam String to,
                                        @RequestParam Long brandId) {
        return ok(accountReportService.lineSales(from, to, "brand", brandId));
    }

    @GetMapping("/sales-by-item")
    public ResponseDO salesByItem(@RequestParam String from,
                                  @RequestParam String to,
                                  @RequestParam Long productId) {
        return ok(accountReportService.lineSales(from, to, "product", productId));
    }

    @GetMapping("/sales-by-customer")
    public ResponseDO salesByCustomer(@RequestParam String from,
                                      @RequestParam String to,
                                      @RequestParam Long customerId) {
        return ok(accountReportService.salesByCustomer(from, to, customerId));
    }

    @GetMapping("/sales-by-attender")
    public ResponseDO salesByAttender(@RequestParam String from,
                                      @RequestParam String to,
                                      @RequestParam(required = false, defaultValue = "0") Long attenderId) {
        return ok(accountReportService.salesByAttender(from, to, attenderId));
    }

    @GetMapping("/day-account")
    public ResponseDO dayAccount(@RequestParam String from, @RequestParam String to) {
        return ok(accountReportService.dayAccount(from, to));
    }

    @GetMapping("/day-book")
    public ResponseDO dayBook(@RequestParam String from, @RequestParam String to) {
        return ok(accountReportService.dayBook(from, to));
    }

    @GetMapping("/day-book/opening-balances")
    public ResponseDO openingBalances() {
        return ok(accountReportService.openingBalances());
    }

    @PostMapping("/day-book/opening-balance")
    public ResponseDO saveOpeningBalance(@RequestBody OpeningBalanceRequest request) {
        return ok(accountReportService.saveOpeningBalance(request, currentUserId()));
    }

    @GetMapping("/commission")
    public ResponseDO commission(@RequestParam String from,
                                 @RequestParam String to,
                                 @RequestParam Long customerId) {
        return ok(accountReportService.commission(from, to, customerId));
    }

    @GetMapping("/commission-customers")
    public ResponseDO commissionCustomers() {
        return ok(accountReportService.commissionCustomers());
    }

    @GetMapping("/gst/sales-summary")
    public ResponseDO gstSalesSummary(@RequestParam String from, @RequestParam String to) {
        return ok(accountReportService.gstSalesSummary(from, to));
    }

    @GetMapping("/gst/bill-wise")
    public ResponseDO gstBillWise(@RequestParam String from, @RequestParam String to) {
        return ok(accountReportService.gstBillWise(from, to));
    }

    @GetMapping("/gst/item-wise")
    public ResponseDO gstItemWise(@RequestParam String from, @RequestParam String to) {
        return ok(accountReportService.gstItemWise(from, to));
    }

    @GetMapping("/gst/hsn")
    public ResponseDO gstHsn(@RequestParam String from, @RequestParam String to) {
        return ok(accountReportService.gstHsn(from, to));
    }

    @GetMapping("/gst/purchase")
    public ResponseDO gstPurchase(@RequestParam String from, @RequestParam String to) {
        return ok(accountReportService.gstPurchase(from, to));
    }

    @GetMapping("/gst/purchase-summary")
    public ResponseDO gstPurchaseSummary(@RequestParam String from, @RequestParam String to) {
        return ok(accountReportService.gstPurchaseSummary(from, to));
    }

    private Long currentUserId() {
        return securityContext.authenticateUser().getId();
    }

    private ResponseDO ok(Object data) {
        ResponseDO response = new ResponseDO();
        response.setSuccess(true);
        response.setData(data);
        return response;
    }
}
