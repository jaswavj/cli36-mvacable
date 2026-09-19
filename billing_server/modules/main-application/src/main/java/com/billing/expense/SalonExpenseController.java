package com.billing.expense;

import com.billing.core.response.ResponseDO;
import com.billing.data.AppUser;
import com.billing.expense.dto.SalonExpenseSaveRequest;
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
@RequestMapping("/api/v1/salon-expenses")
public class SalonExpenseController {

    private final SalonExpenseService salonExpenseService;
    private final PlatformSecurityContext securityContext;

    @PostMapping
    public ResponseDO save(@RequestBody SalonExpenseSaveRequest request) {
        return ok(salonExpenseService.save(request, currentUser()));
    }

    @GetMapping("/report")
    public ResponseDO report(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam(required = false) String shopId
    ) {
        return ok(salonExpenseService.report(from, to, shopId, currentUser()));
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
