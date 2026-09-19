package com.billing.admin;

import com.billing.admin.dto.AssignCustomerRequest;
import com.billing.admin.dto.CancelBillRequest;
import com.billing.admin.dto.CompanyDetailsData;
import com.billing.admin.dto.DateUpdateRequest;
import com.billing.admin.dto.ExchangeSaveRequest;
import com.billing.admin.dto.PaymentUpdateRequest;
import com.billing.admin.dto.ReturnSaveRequest;
import com.billing.core.response.ResponseDO;
import com.billing.security.PlatformSecurityContext;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final AdminService adminService;
    private final PlatformSecurityContext securityContext;

    @GetMapping("/company")
    public ResponseDO company() {
        return ok(adminService.company());
    }

    @PostMapping("/company")
    public ResponseDO saveCompany(@RequestBody CompanyDetailsData request) {
        adminService.saveCompany(request);
        return ok(true);
    }

    @GetMapping("/users")
    public ResponseDO users() {
        return ok(adminService.users());
    }

    @GetMapping("/bills")
    public ResponseDO bills(@RequestParam String from,
                            @RequestParam String to,
                            @RequestParam(required = false) Long userId) {
        return ok(adminService.bills(from, to, userId));
    }

    @GetMapping("/bills/{id}")
    public ResponseDO billDetail(@PathVariable Long id) {
        return ok(adminService.billDetail(id));
    }

    @PostMapping("/bills/{id}/date")
    public ResponseDO updateDate(@PathVariable Long id, @RequestBody DateUpdateRequest request) {
        adminService.updateBillDate(id, request, currentUserId());
        return ok(true);
    }

    @PostMapping("/bills/{id}/cancel")
    public ResponseDO cancel(@PathVariable Long id, @RequestBody CancelBillRequest request) {
        adminService.cancelBill(id, request, currentUserId());
        return ok(true);
    }

    @GetMapping("/payment")
    public ResponseDO payment(@RequestParam String billNo) {
        return ok(adminService.paymentInfo(billNo));
    }

    @PostMapping("/payment")
    public ResponseDO updatePayment(@RequestBody PaymentUpdateRequest request) {
        adminService.updatePayment(request, currentUserId());
        return ok(true);
    }

    @GetMapping("/exchange")
    public ResponseDO exchangeBill(@RequestParam String billNo) {
        return ok(adminService.exchangeBill(billNo));
    }

    @GetMapping("/exchange/products")
    public ResponseDO exchangeProducts(@RequestParam String term) {
        return ok(adminService.searchExchangeProducts(term));
    }

    @PostMapping("/exchange/customer")
    public ResponseDO assignCustomer(@RequestBody AssignCustomerRequest request) {
        return ok(adminService.assignCustomer(request));
    }

    @PostMapping("/exchange")
    public ResponseDO saveExchange(@RequestBody ExchangeSaveRequest request) {
        return ok(adminService.saveExchange(request, currentUserId()));
    }

    @PostMapping("/exchange/return")
    public ResponseDO saveReturn(@RequestBody ReturnSaveRequest request) {
        return ok(adminService.saveReturn(request, currentUserId()));
    }

    @GetMapping("/reports/bill-date")
    public ResponseDO dateChangeReport(@RequestParam String from, @RequestParam String to) {
        return ok(adminService.dateChangeReport(from, to));
    }

    @GetMapping("/reports/cancel")
    public ResponseDO cancelReport(@RequestParam String from, @RequestParam String to) {
        return ok(adminService.cancelReport(from, to));
    }

    @GetMapping("/reports/payment-type")
    public ResponseDO paymentChangeReport(@RequestParam String from, @RequestParam String to) {
        return ok(adminService.paymentChangeReport(from, to));
    }

    @GetMapping("/reports/exchange")
    public ResponseDO exchangeReport(@RequestParam String from,
                                     @RequestParam String to,
                                     @RequestParam(required = false) Integer type) {
        return ok(adminService.exchangeReport(from, to, type));
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
