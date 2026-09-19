package com.billing.collection;

import com.billing.collection.dto.CollectionCancelRequest;
import com.billing.collection.dto.CollectionSaveRequest;
import com.billing.collection.dto.CollectionUpdateRequest;
import com.billing.core.response.ResponseDO;
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
@RequestMapping("/api/v1/cable-collections")
public class CollectionController {

    private final CollectionService collectionService;
    private final CollectionPrintService collectionPrintService;
    private final PlatformSecurityContext securityContext;

    @GetMapping("/lookup")
    public ResponseDO lookup(@RequestParam String customerId) {
        return ok(collectionService.lookup(customerId, currentUser()));
    }

    @GetMapping("/pending-customers")
    public ResponseDO pendingCustomers() {
        return ok(collectionService.pendingCustomers(currentUser()));
    }

    @GetMapping("/report")
    public ResponseDO report(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String payMode,
            @RequestParam(required = false) String customerType
    ) {
        return ok(collectionService.report(from, to, userId, payMode, customerType, currentUser()));
    }

    @GetMapping("/account")
    public ResponseDO account(@RequestParam String from, @RequestParam String to) {
        return ok(collectionService.account(from, to, currentUser()));
    }

    @GetMapping("/dashboard")
    public ResponseDO dashboard(@RequestParam(required = false) Integer year,
                                @RequestParam(required = false) Integer month) {
        return ok(collectionService.dashboard(year, month, currentUser()));
    }

    @GetMapping("/edit-log")
    public ResponseDO editLog(@RequestParam String from, @RequestParam String to) {
        return ok(collectionService.editLog(from, to, currentUser()));
    }

    @PostMapping("/{id}/update")
    public ResponseDO update(@PathVariable Long id, @RequestBody CollectionUpdateRequest request) {
        collectionService.updateCollection(id, request, currentUser());
        return ok(true);
    }

    @PostMapping("/{id}/cancel")
    public ResponseDO cancel(@PathVariable Long id, @RequestBody CollectionCancelRequest request) {
        collectionService.cancelCollection(id, request, currentUser());
        return ok(true);
    }

    @PostMapping
    public ResponseDO save(@RequestBody CollectionSaveRequest request) {
        return ok(collectionService.save(request, currentUser()));
    }

    @GetMapping("/print/{id}")
    public ResponseDO printReceipt(@PathVariable Long id) {
        return ok(collectionPrintService.receipt(id, currentUser()));
    }

    @PostMapping("/print/{id}")
    public ResponseDO dispatchPrint(@PathVariable Long id) {
        return ok(collectionPrintService.dispatch(id, currentUser()));
    }

    @PostMapping("/print/{id}/pos")
    public ResponseDO posPrint(@PathVariable Long id) {
        return ok(collectionPrintService.printReceipt(id, currentUser()));
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
