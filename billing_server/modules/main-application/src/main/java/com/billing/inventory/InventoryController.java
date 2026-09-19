package com.billing.inventory;

import com.billing.core.response.ResponseDO;
import com.billing.inventory.dto.SavePurchaseRequest;
import com.billing.inventory.dto.SavePurchaseReturnRequest;
import com.billing.inventory.dto.SupplierSaveRequest;
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
@RequestMapping("/api/v1/inventory")
public class InventoryController {

    private final InventoryService inventoryService;
    private final PlatformSecurityContext securityContext;

    @GetMapping("/suppliers")
    public ResponseDO suppliers() {
        return ok(inventoryService.suppliers());
    }

    @PostMapping("/suppliers")
    public ResponseDO saveSupplier(@RequestBody SupplierSaveRequest request) {
        inventoryService.saveSupplier(request);
        return ok(true);
    }

    @PostMapping("/suppliers/{id}/block")
    public ResponseDO blockSupplier(@PathVariable Long id) {
        inventoryService.blockSupplier(id);
        return ok(true);
    }

    @GetMapping("/lookups")
    public ResponseDO lookups() {
        return ok(inventoryService.lookups());
    }

    @GetMapping("/products")
    public ResponseDO searchProducts(@RequestParam String term) {
        return ok(inventoryService.searchProductNames(term));
    }

    @GetMapping("/products/by-name")
    public ResponseDO productByName(@RequestParam String name) {
        return ok(inventoryService.productByName(name));
    }

    @GetMapping("/products/by-code")
    public ResponseDO productByCode(@RequestParam String code) {
        return ok(inventoryService.productByCode(code));
    }

    @GetMapping("/products/history")
    public ResponseDO history(@RequestParam String name) {
        return ok(inventoryService.productHistory(name));
    }

    @GetMapping("/products/{id}")
    public ResponseDO productById(@PathVariable Long id) {
        return ok(inventoryService.productById(id));
    }

    @PostMapping("/purchases")
    public ResponseDO savePurchase(@RequestBody SavePurchaseRequest request) {
        return ok(inventoryService.savePurchase(request, currentUserId()));
    }

    @GetMapping("/purchases/report")
    public ResponseDO purchaseReport(@RequestParam String from,
                                     @RequestParam String to,
                                     @RequestParam(required = false) Long supplierId) {
        return ok(inventoryService.purchaseReport(from, to, supplierId));
    }

    @GetMapping("/purchases/{id}")
    public ResponseDO purchaseDetails(@PathVariable Long id) {
        return ok(inventoryService.purchaseDetails(id));
    }

    @GetMapping("/returns/bill")
    public ResponseDO purchaseForReturn(@RequestParam String search) {
        return ok(inventoryService.purchaseForReturn(search));
    }

    @PostMapping("/returns")
    public ResponseDO saveReturn(@RequestBody SavePurchaseReturnRequest request) {
        return ok(inventoryService.savePurchaseReturn(request, currentUserId()));
    }

    @GetMapping("/returns/report")
    public ResponseDO returnReport(@RequestParam String from,
                                   @RequestParam String to,
                                   @RequestParam(required = false) Long supplierId) {
        return ok(inventoryService.returnReport(from, to, supplierId));
    }

    @GetMapping("/returns/history")
    public ResponseDO returnHistory(@RequestParam Long detailId) {
        return ok(inventoryService.returnHistory(detailId));
    }

    @GetMapping("/payments/report")
    public ResponseDO paymentReport(@RequestParam String from,
                                    @RequestParam String to,
                                    @RequestParam(required = false) Long supplierId) {
        return ok(inventoryService.supplierPaymentReport(from, to, supplierId));
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
