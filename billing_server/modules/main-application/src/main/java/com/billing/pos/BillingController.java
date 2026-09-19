package com.billing.pos;

import com.billing.core.response.ResponseDO;
import com.billing.data.AppUser;
import com.billing.pos.dto.HoldBillRequest;
import com.billing.pos.dto.SaveBillRequest;
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
@RequestMapping("/api/v1/billing")
public class BillingController {

    private final BillingReadService readService;
    private final BillingWriteService writeService;
    private final PosPrinterService posPrinterService;
    private final PlatformSecurityContext securityContext;

    @GetMapping("/options")
    public ResponseDO options() {
        return ok(readService.options(currentUserId()));
    }

    @GetMapping("/products")
    public ResponseDO searchProducts(@RequestParam String term) {
        return ok(readService.searchProductNames(term));
    }

    @GetMapping("/products/by-code")
    public ResponseDO productByCode(@RequestParam String code) {
        return ok(readService.findProductByCode(code));
    }

    @GetMapping("/products/by-name")
    public ResponseDO productByName(@RequestParam String name) {
        return ok(readService.findProductByName(name));
    }

    @GetMapping("/products/{id}/stock")
    public ResponseDO productStock(@PathVariable Long id) {
        return ok(readService.productStock(id));
    }

    @GetMapping("/products/{id}/history")
    public ResponseDO productHistory(@PathVariable Long id, @RequestParam(required = false) Long customerId) {
        return ok(readService.productHistory(id, customerId));
    }

    @GetMapping("/customers")
    public ResponseDO customers(@RequestParam(required = false) String query,
                                @RequestParam(required = false) String phone) {
        return ok(readService.searchCustomers(query, phone));
    }

    @PostMapping("/save")
    public ResponseDO save(@RequestBody SaveBillRequest request) {
        AppUser user = currentUser();
        return ok(writeService.saveBill(request, user.getId(), user.shopId()));
    }

    @PostMapping("/hold")
    public ResponseDO hold(@RequestBody HoldBillRequest request) {
        return ok(writeService.saveHold(request, currentUserId()));
    }

    @GetMapping("/holds")
    public ResponseDO holds() {
        return ok(readService.quotationList());
    }

    @GetMapping("/holds/{id}")
    public ResponseDO holdDetails(@PathVariable Long id) {
        return ok(readService.quotationDetails(id));
    }

    @PostMapping("/holds/{id}/cancel")
    public ResponseDO cancelHold(@PathVariable Long id) {
        writeService.cancelHold(id);
        return ok(true);
    }

    @GetMapping("/recent")
    public ResponseDO recentBills() {
        return ok(readService.recentBills());
    }

    @GetMapping("/print/{billNo}")
    public ResponseDO printBill(@PathVariable String billNo) {
        return ok(readService.printBill(billNo));
    }

    @PostMapping("/print/{billNo}")
    public ResponseDO dispatchPrint(@PathVariable String billNo) {
        return ok(posPrinterService.dispatch(billNo));
    }

    @PostMapping("/print/{billNo}/pos")
    public ResponseDO posPrint(@PathVariable String billNo) {
        return ok(posPrinterService.printReceipt(billNo));
    }

    private AppUser currentUser() {
        return securityContext.authenticateUser();
    }

    private Long currentUserId() {
        return currentUser().getId();
    }

    private ResponseDO ok(Object data) {
        ResponseDO response = new ResponseDO();
        response.setSuccess(true);
        response.setData(data);
        return response;
    }
}
