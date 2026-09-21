package com.billing.customer;

import com.billing.core.response.ResponseDO;
import com.billing.customer.dto.CableCustomerDisconnectRequest;
import com.billing.customer.dto.CableCustomerReconnectRequest;
import com.billing.customer.dto.CableCustomerSaveRequest;
import com.billing.data.AppUser;
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
@RequestMapping("/api/v1/cable-customers")
public class CableCustomerController {

    private final CableCustomerService cableCustomerService;
    private final PlatformSecurityContext securityContext;

    @GetMapping
    public ResponseDO list(
            @RequestParam(required = false) String type,
            @RequestParam(required = false, defaultValue = "false") boolean activeOnly,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        return ok(cableCustomerService.page(currentUser(), type, activeOnly, search, page, size));
    }

    @GetMapping("/connections")
    public ResponseDO connections(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        return ok(cableCustomerService.connections(currentUser(), from, to, type, search, page, size));
    }

    @GetMapping("/disconnections")
    public ResponseDO disconnections(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        return ok(cableCustomerService.disconnections(currentUser(), from, to, type, search, page, size));
    }

    @PostMapping
    public ResponseDO save(@RequestBody CableCustomerSaveRequest request) {
        return ok(cableCustomerService.save(request, currentUser()));
    }

    @PostMapping("/{id}/disconnect")
    public ResponseDO disconnect(@PathVariable Long id, @RequestBody CableCustomerDisconnectRequest request) {
        cableCustomerService.disconnect(id, request, currentUser());
        return ok(true);
    }

    @PostMapping("/{id}/reconnect")
    public ResponseDO reconnect(@PathVariable Long id, @RequestBody CableCustomerReconnectRequest request) {
        cableCustomerService.reconnect(id, request, currentUser());
        return ok(true);
    }

    @PostMapping("/{id}/active")
    public ResponseDO setActive(@PathVariable Long id, @RequestParam(defaultValue = "true") boolean active) {
        cableCustomerService.setActive(id, active, currentUser());
        return ok(true);
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
