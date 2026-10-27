package com.billing.expense;

import com.billing.core.response.ResponseDO;
import com.billing.data.AppUser;
import com.billing.expense.dto.SalonExpenseSaveRequest;
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
@RequestMapping("/api/v1/salon-expenses")
public class SalonExpenseController {

    private final SalonExpenseService salonExpenseService;
    private final PlatformSecurityContext securityContext;

    @PostMapping
    public ResponseDO save(@RequestBody SalonExpenseSaveRequest request) {
        return ok(salonExpenseService.save(request, currentUser()));
    }

    @PostMapping("/{id}/update")
    public ResponseDO update(@PathVariable Long id, @RequestBody SalonExpenseSaveRequest request) {
        salonExpenseService.update(id, request, currentUser());
        return ok(true);
    }

    @GetMapping("/report")
    public ResponseDO report(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam(required = false) String shopId,
            @RequestParam(required = false) Long userId
    ) {
        return ok(salonExpenseService.report(from, to, shopId, userId, currentUser()));
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
