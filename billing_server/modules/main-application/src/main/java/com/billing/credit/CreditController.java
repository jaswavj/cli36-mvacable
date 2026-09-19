package com.billing.credit;

import com.billing.core.response.ResponseDO;
import com.billing.credit.dto.AccountEntryRequest;
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
@RequestMapping("/api/v1/credit")
public class CreditController {

    private final CreditService creditService;
    private final PlatformSecurityContext securityContext;

    @GetMapping("/customers/summary")
    public ResponseDO customerSummary() {
        return ok(creditService.customerSummary());
    }

    @GetMapping("/customers/search")
    public ResponseDO searchCustomers(@RequestParam(required = false) String query,
                                      @RequestParam(required = false) String phone) {
        return ok(creditService.searchCustomers(query, phone));
    }

    @GetMapping("/customers/{id}")
    public ResponseDO customerAccount(@PathVariable Long id) {
        return ok(creditService.customerAccount(id));
    }

    @PostMapping("/customers/{id}/entry")
    public ResponseDO saveCustomerEntry(@PathVariable Long id, @RequestBody AccountEntryRequest request) {
        return ok(creditService.saveCustomerEntry(id, request, currentUserId()));
    }

    @GetMapping("/suppliers/summary")
    public ResponseDO supplierSummary() {
        return ok(creditService.supplierSummary());
    }

    @GetMapping("/suppliers/search")
    public ResponseDO searchSuppliers(@RequestParam(required = false) String query) {
        return ok(creditService.searchSuppliers(query));
    }

    @GetMapping("/suppliers/{id}")
    public ResponseDO supplierAccount(@PathVariable Long id) {
        return ok(creditService.supplierAccount(id));
    }

    @PostMapping("/suppliers/{id}/entry")
    public ResponseDO saveSupplierEntry(@PathVariable Long id, @RequestBody AccountEntryRequest request) {
        return ok(creditService.saveSupplierEntry(id, request, currentUserId()));
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
