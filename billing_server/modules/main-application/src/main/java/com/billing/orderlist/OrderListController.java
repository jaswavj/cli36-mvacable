package com.billing.orderlist;

import com.billing.core.response.ResponseDO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/orders")
public class OrderListController {

    private final OrderListService orderListService;

    @GetMapping
    public ResponseDO list(@RequestParam(required = false, defaultValue = "pending") String type) {
        return ok(orderListService.list(type));
    }

    @GetMapping("/{id}")
    public ResponseDO detail(@PathVariable Long id) {
        return ok(orderListService.detail(id));
    }

    @PostMapping("/{id}/deliver")
    public ResponseDO markOrderDelivered(@PathVariable Long id) {
        return ok(orderListService.markOrderDelivered(id));
    }

    @PostMapping("/items/{detailId}/deliver")
    public ResponseDO markItemDelivered(@PathVariable Long detailId) {
        return ok(orderListService.markItemDelivered(detailId));
    }

    private ResponseDO ok(Object data) {
        ResponseDO response = new ResponseDO();
        response.setSuccess(true);
        response.setData(data);
        return response;
    }
}
