package com.billing.stock;

import com.billing.core.response.ResponseDO;
import com.billing.data.AppUser;
import com.billing.security.PlatformSecurityContext;
import com.billing.stock.dto.StockMoveRequest;
import com.billing.stock.dto.StockProductSaveRequest;
import com.billing.stock.dto.StockSaleCancelRequest;
import com.billing.stock.dto.StockSaleUpdateRequest;
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
@RequestMapping("/api/v1/stock")
public class StockController {

    private final StockService stockService;
    private final PlatformSecurityContext securityContext;

    @GetMapping("/products")
    public ResponseDO products() {
        return ok(stockService.products(currentUser()));
    }

    @PostMapping("/products")
    public ResponseDO saveProduct(@RequestBody StockProductSaveRequest request) {
        stockService.saveProduct(request, currentUser());
        return ok(true);
    }

    @PostMapping("/in")
    public ResponseDO addStock(@RequestBody StockMoveRequest request) {
        stockService.addStock(request, currentUser());
        return ok(true);
    }

    @PostMapping("/sales")
    public ResponseDO saveSale(@RequestBody StockMoveRequest request) {
        stockService.saveSale(request, currentUser());
        return ok(true);
    }

    @GetMapping("/sales")
    public ResponseDO saleReport(@RequestParam String from, @RequestParam String to) {
        return ok(stockService.saleReport(from, to, currentUser()));
    }

    @PostMapping("/sales/{id}/update")
    public ResponseDO updateSale(@PathVariable Long id, @RequestBody StockSaleUpdateRequest request) {
        stockService.updateSale(id, request, currentUser());
        return ok(true);
    }

    @PostMapping("/sales/{id}/cancel")
    public ResponseDO cancelSale(@PathVariable Long id, @RequestBody StockSaleCancelRequest request) {
        stockService.cancelSale(id, request, currentUser());
        return ok(true);
    }

    @GetMapping("/sales/edit-log")
    public ResponseDO saleLog(@RequestParam String from, @RequestParam String to) {
        return ok(stockService.saleLog(from, to, currentUser()));
    }

    private AppUser currentUser() {
        return securityContext.authenticateUser();
    }

    private ResponseDO ok(Object data) {
        ResponseDO response = new ResponseDO();
        response.setSuccess(true);
        response.setData(data);
        return response;
    }
}