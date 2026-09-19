package com.billing.statistics;

import com.billing.core.response.ResponseDO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/statistics")
public class StatisticsController {

    private final StatisticsService statisticsService;

    @GetMapping("/profit")
    public ResponseDO profit(@RequestParam String from,
                             @RequestParam String to,
                             @RequestParam(required = false) String type) {
        return ok(statisticsService.profit(from, to, type));
    }

    @GetMapping("/dashboard")
    public ResponseDO dashboard(@RequestParam(required = false) Integer year,
                                @RequestParam(required = false) Integer month) {
        return ok(statisticsService.dashboard(year, month));
    }

    @GetMapping("/category-sales")
    public ResponseDO categorySales(@RequestParam String from, @RequestParam String to) {
        return ok(statisticsService.categorySales(from, to));
    }

    @GetMapping("/category-sales/{catId}/products")
    public ResponseDO categoryProducts(@PathVariable Long catId,
                                       @RequestParam String from,
                                       @RequestParam String to) {
        return ok(statisticsService.categoryProducts(catId, from, to));
    }

    @GetMapping("/product-analysis")
    public ResponseDO productAnalysis(@RequestParam Long prodId,
                                      @RequestParam String from,
                                      @RequestParam String to) {
        return ok(statisticsService.productAnalysis(prodId, from, to));
    }

    @GetMapping("/balance-summary")
    public ResponseDO balanceSummary(@RequestParam String from, @RequestParam String to) {
        return ok(statisticsService.balanceSummary(from, to));
    }

    private ResponseDO ok(Object data) {
        ResponseDO response = new ResponseDO();
        response.setSuccess(true);
        response.setData(data);
        return response;
    }
}
