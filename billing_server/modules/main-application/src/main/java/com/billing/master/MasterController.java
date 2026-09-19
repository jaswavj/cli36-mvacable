package com.billing.master;

import com.billing.core.response.ResponseDO;
import com.billing.master.dto.BulkUpdateItem;
import com.billing.master.dto.ComponentSaveRequest;
import com.billing.master.dto.CustomerSaveRequest;
import com.billing.master.dto.NameSaveRequest;
import com.billing.master.dto.ProductSaveRequest;
import com.billing.master.dto.StockAdjustRequest;
import com.billing.master.dto.UnitSaveRequest;
import com.billing.security.PlatformSecurityContext;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/master")
public class MasterController {

    private final MasterService masterService;
    private final PlatformSecurityContext securityContext;

    @GetMapping("/lookups")
    public ResponseDO lookups() {
        return ok(masterService.lookups());
    }

    @GetMapping("/categories")
    public ResponseDO categories() {
        return ok(masterService.categories());
    }

    @PostMapping("/categories")
    public ResponseDO saveCategory(@RequestBody NameSaveRequest request) {
        masterService.saveCategory(request);
        return ok(true);
    }

    @PostMapping("/categories/{id}/block")
    public ResponseDO blockCategory(@PathVariable Long id) {
        masterService.blockCategory(id);
        return ok(true);
    }

    @GetMapping("/brands")
    public ResponseDO brands() {
        return ok(masterService.brands());
    }

    @PostMapping("/brands")
    public ResponseDO saveBrand(@RequestBody NameSaveRequest request) {
        masterService.saveBrand(request);
        return ok(true);
    }

    @PostMapping("/brands/{id}/block")
    public ResponseDO blockBrand(@PathVariable Long id) {
        masterService.blockBrand(id);
        return ok(true);
    }

    @GetMapping("/units")
    public ResponseDO units() {
        return ok(masterService.units());
    }

    @PostMapping("/units")
    public ResponseDO saveUnit(@RequestBody UnitSaveRequest request) {
        masterService.saveUnit(request);
        return ok(true);
    }

    @PostMapping("/units/{id}/status")
    public ResponseDO unitStatus(@PathVariable Long id, @RequestParam int active) {
        masterService.updateUnitStatus(id, active);
        return ok(true);
    }

    @GetMapping("/customers")
    public ResponseDO customers() {
        return ok(masterService.customers());
    }

    @PostMapping("/customers")
    public ResponseDO saveCustomer(@RequestBody CustomerSaveRequest request) {
        masterService.saveCustomer(request);
        return ok(true);
    }

    @PostMapping("/customers/{id}/block")
    public ResponseDO blockCustomer(@PathVariable Long id) {
        masterService.blockCustomer(id);
        return ok(true);
    }

    @GetMapping("/products")
    public ResponseDO products() {
        return ok(masterService.products());
    }

    @PostMapping("/products")
    public ResponseDO saveProduct(@RequestBody ProductSaveRequest request) {
        masterService.saveProduct(request, currentUserId());
        return ok(true);
    }

    @PostMapping("/products/{id}/block")
    public ResponseDO blockProduct(@PathVariable Long id) {
        masterService.blockProduct(id);
        return ok(true);
    }

    @GetMapping("/stock/products")
    public ResponseDO stockProducts() {
        return ok(masterService.stockProducts());
    }

    @PostMapping("/stock/adjust")
    public ResponseDO adjustStock(@RequestBody StockAdjustRequest request) {
        masterService.adjustStock(request, currentUserId());
        return ok(true);
    }

    @GetMapping("/components")
    public ResponseDO components(@RequestParam Long productId) {
        return ok(masterService.components(productId));
    }

    @PostMapping("/components")
    public ResponseDO saveComponent(@RequestBody ComponentSaveRequest request) {
        masterService.saveComponent(request, currentUserId());
        return ok(true);
    }

    @DeleteMapping("/components/{id}")
    public ResponseDO deleteComponent(@PathVariable Long id) {
        masterService.deleteComponent(id);
        return ok(true);
    }

    @GetMapping("/tables")
    public ResponseDO cafeTables() {
        return ok(masterService.cafeTables());
    }

    @PostMapping("/tables")
    public ResponseDO saveCafeTable(@RequestBody NameSaveRequest request) {
        masterService.saveCafeTable(request);
        return ok(true);
    }

    @DeleteMapping("/tables/{id}")
    public ResponseDO deleteCafeTable(@PathVariable Long id) {
        masterService.deleteCafeTable(id);
        return ok(true);
    }

    @GetMapping("/bulk-products")
    public ResponseDO bulkProducts(@RequestParam(required = false) String name,
                                   @RequestParam(required = false) Long categoryId) {
        return ok(masterService.bulkProducts(name, categoryId));
    }

    @PostMapping("/bulk-products")
    public ResponseDO bulkUpdate(@RequestBody List<BulkUpdateItem> items) {
        return ok(masterService.bulkUpdate(items));
    }

    @GetMapping("/barcodes")
    public ResponseDO barcodes() {
        return ok(masterService.barcodes());
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
