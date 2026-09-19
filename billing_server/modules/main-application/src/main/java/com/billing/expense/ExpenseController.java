package com.billing.expense;

import com.billing.core.response.ResponseDO;
import com.billing.expense.dto.ExpenseSaveRequest;
import com.billing.expense.dto.ExpenseTypeSaveRequest;
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
@RequestMapping("/api/v1/expense")
public class ExpenseController {

    private final ExpenseService expenseService;
    private final PlatformSecurityContext securityContext;

    @GetMapping("/types")
    public ResponseDO types() {
        return ok(expenseService.types());
    }

    @PostMapping("/types")
    public ResponseDO saveType(@RequestBody ExpenseTypeSaveRequest request) {
        expenseService.saveType(request);
        return ok(true);
    }

    @PostMapping("/types/{id}/block")
    public ResponseDO blockType(@PathVariable Long id) {
        expenseService.blockType(id);
        return ok(true);
    }

    @PostMapping("/entries")
    public ResponseDO saveEntry(@RequestBody ExpenseSaveRequest request) {
        return ok(expenseService.saveEntry(request, currentUserId()));
    }

    @GetMapping("/report")
    public ResponseDO report(@RequestParam String from,
                             @RequestParam String to,
                             @RequestParam(required = false) Long typeId) {
        return ok(expenseService.report(from, to, typeId));
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
